"use client";

import type { Mess } from "./types";

const KEY = "mm.recentMesses";
const MAX = 6;

export interface RecentMess {
  id: string;
  name: string;
  at: number;
}

/**
 * Remembers the messes this device created so a phone that loses the URL can
 * still find its way back. Nothing is stored on a server.
 */
export function getRecentMesses(): RecentMess[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentMess[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.id === "string" && typeof item.name === "string")
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function rememberMess(mess: Pick<Mess, "id" | "name">): void {
  if (typeof window === "undefined") return;
  try {
    const next: RecentMess[] = [
      { id: mess.id, name: mess.name, at: Date.now() },
      ...getRecentMesses().filter((item) => item.id !== mess.id),
    ].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}

export function forgetMess(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(getRecentMesses().filter((item) => item.id !== id)));
  } catch {
    /* ignore */
  }
}
