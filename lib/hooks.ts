"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

const noop = () => () => {};

/**
 * `true` on the client, `false` during SSR/hydration.
 *
 * Implemented with `useSyncExternalStore` so React can use the server snapshot
 * while hydrating and swap in the client value afterwards — no state-setting
 * effect, no hydration mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

/** Raw localStorage string, subscribed so every reader re-renders together. */
export function useLocalStorageValue(key: string): string | null {
  return useSyncExternalStore(
    (listener) => {
      window.addEventListener("storage", listener);
      window.addEventListener(`mm:${key}`, listener);
      return () => {
        window.removeEventListener("storage", listener);
        window.removeEventListener(`mm:${key}`, listener);
      };
    },
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
}

/** Writes to localStorage and notifies every subscriber in this tab. */
export function writeLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode / quota — the value just won't persist */
  }
  window.dispatchEvent(new Event(`mm:${key}`));
}

/** Debounces a rapidly changing value (used by the meal count steppers). */
export function useDebounced<T>(value: T, delay = 500): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Locks body scroll while a sheet/modal is open. */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}

/**
 * Mirror of the latest render values in a ref — read inside cleanup functions
 * (e.g. "flush the pending write when this row unmounts") where the closure
 * would otherwise be stale. Refs are only touched inside effects.
 */
export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

export type { ReactNode };
