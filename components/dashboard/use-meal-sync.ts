"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { upsertMeal } from "@/lib/data";
import { round2 } from "@/lib/format";
import { describeError, getSupabase } from "@/lib/supabase";

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

interface UseMealSyncArgs {
  messId: string;
  memberId: string;
  date: string;
  /** The value currently stored on the server for (memberId, date). */
  serverValue: number;
  /** Called after a successful write so the parent can patch its cache. */
  onSaved?: (value: number) => void;
  debounceMs?: number;
}

interface UseMealSyncResult {
  value: number;
  status: SaveStatus;
  error: string | null;
  /** Update locally and schedule a debounced write. */
  setValue: (next: number) => void;
  /** Update locally and write immediately (steppers, quick-fill chips). */
  commit: (next: number) => void;
}

const clamp = (value: number) => round2(Math.min(999, Math.max(0, value)));

/**
 * Keeps one member's meal count for one day in sync with Supabase.
 *
 * Local state updates instantly (mobile taps should never feel laggy) and the
 * write is debounced, so holding + does not fire a request per tap. Writes are
 * an upsert on (member_id, date), so repeats are idempotent.
 *
 * Switching day/member/mess is handled by adjusting state during render — the
 * pattern React recommends over a reset effect — which is what keeps the tab's
 * date switcher instant.
 */
export function useMealSync({
  messId,
  memberId,
  date,
  serverValue,
  onSaved,
  debounceMs = 650,
}: UseMealSyncArgs): UseMealSyncResult {
  const [value, setValueState] = useState(serverValue);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [identity, setIdentity] = useState(`${messId}|${memberId}|${date}`);
  const [knownServer, setKnownServer] = useState(serverValue);

  const timer = useRef<number | null>(null);

  const nextIdentity = `${messId}|${memberId}|${date}`;
  if (identity !== nextIdentity) {
    // A different record: adopt its value and forget any pending edit.
    setIdentity(nextIdentity);
    setKnownServer(serverValue);
    setValueState(serverValue);
    setStatus("idle");
    setError(null);
    setDirty(false);
  } else if (knownServer !== serverValue) {
    // Another phone edited this row: adopt it unless the user is mid-edit.
    setKnownServer(serverValue);
    if (!dirty) setValueState(serverValue);
  }

  const write = useCallback(
    async (next: number) => {
      if (clamp(next) === clamp(knownServer)) {
        setStatus("idle");
        return;
      }
      setStatus("saving");
      setError(null);
      try {
        await upsertMeal(messId, memberId, date, clamp(next));
        setKnownServer(clamp(next));
        setStatus("saved");
        onSaved?.(clamp(next));
        window.setTimeout(
          () => setStatus((current) => (current === "saved" ? "idle" : current)),
          1600,
        );
      } catch (err) {
        setStatus("error");
        setError(describeError(err));
      }
    },
    [date, knownServer, memberId, messId, onSaved],
  );

  const setValue = useCallback(
    (next: number) => {
      const safe = clamp(next);
      setValueState(safe);
      setDirty(true);
      setStatus("dirty");
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        setDirty(false);
        void write(safe);
      }, debounceMs);
    },
    [debounceMs, write],
  );

  const commit = useCallback(
    (next: number) => {
      const safe = clamp(next);
      setValueState(safe);
      setDirty(false);
      if (timer.current) window.clearTimeout(timer.current);
      void write(safe);
    },
    [write],
  );

  // Latest values, kept for the unmount flush below.
  const flushable = useRef({ dirty, value, knownServer, messId, memberId, date, onSaved });
  useEffect(() => {
    flushable.current = { dirty, value, knownServer, messId, memberId, date, onSaved };
  }, [dirty, value, knownServer, messId, memberId, date, onSaved]);

  // Best-effort flush when the row unmounts (tab switch, navigation) so a tap
  // moments before leaving is never lost.
  useEffect(() => {
    const element = flushable;
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      const pending = element.current;
      if (!pending.dirty) return;
      if (clamp(pending.value) === clamp(pending.knownServer)) return;
      void upsertMeal(pending.messId, pending.memberId, pending.date, clamp(pending.value))
        .then(() => pending.onSaved?.(clamp(pending.value)))
        .catch(() => undefined);
    };
  }, []);

  return { value, status, error, setValue, commit };
}

/**
 * Live updates: Postgres change events (when the tables are in the
 * `supabase_realtime` publication) plus a visibility-aware poll as a fallback,
 * so a phone sees another member's entry without a manual refresh.
 */
export function useMessRealtimeRefresh(refresh: () => void, enabled: boolean, intervalMs = 60000) {
  const latest = useRef(refresh);
  useEffect(() => {
    latest.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    const element = latest;
    let channel: { unsubscribe: () => void } | null = null;
    try {
      channel = getSupabase()
        .channel("mess-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "meals" }, () => element.current())
        .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => element.current())
        .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => element.current())
        .subscribe();
    } catch {
      channel = null;
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") element.current();
    }, intervalMs);

    return () => {
      window.clearInterval(interval);
      if (channel) channel.unsubscribe();
    };
  }, [enabled, intervalMs]);
}
