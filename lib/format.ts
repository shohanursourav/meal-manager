import { localizeDigits } from "./i18n";
import type { Locale } from "./types";

/** Coerce PostgREST numerics (which may arrive as strings) into a number. */
export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

/**
 * Round to 2 decimals without float drift (avoids the classic
 * `1.005 * 100 = 100.49999999` trap) and normalise `-0` to `0` so balanced
 * books never render or compare as negative zero.
 */
export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const scaled = value * 100;
  const rounded = Math.round(scaled + (scaled >= 0 ? 1e-6 : -1e-6)) / 100;
  return rounded === 0 ? 0 : rounded;
}

export function sum(values: number[]): number {
  return values.reduce((acc, n) => acc + n, 0);
}

const BN_MONTHS = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];
const BN_MONTHS_SHORT = [
  "জানু",
  "ফেব",
  "মার্চ",
  "এপ্রি",
  "মে",
  "জুন",
  "জুল",
  "আগ",
  "সেপ",
  "অক্টো",
  "নভে",
  "ডিসে",
];
const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const EN_MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const BN_WEEKDAYS = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"];
const EN_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Today as YYYY-MM-DD in the user's LOCAL timezone (never UTC-shifted). */
export function todayISO(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** YYYY-MM for a given YYYY-MM-DD. */
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

/** Inclusive first/last day of a YYYY-MM month. */
export function monthBounds(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, "0")}` };
}

/** Parse YYYY-MM-DD as a timezone-free local date. */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "2026-10-16" → "১৬ অক্টোবর ২০২৬" (bn) / "16 Oct 2026" (en). */
export function formatDate(iso: string, locale: Locale, opts?: { withWeekday?: boolean }): string {
  if (!iso || iso.length < 10) return iso ?? "";
  const d = parseISO(iso);
  const months = locale === "bn" ? BN_MONTHS : EN_MONTHS_SHORT;
  const weekday = locale === "bn" ? BN_WEEKDAYS : EN_WEEKDAYS;
  const base = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  const text = opts?.withWeekday ? `${weekday[d.getDay()]}, ${base}` : base;
  return localizeDigits(text, locale);
}

/** "2026-10" → "অক্টোবর ২০২৬" (bn) / "October 2026" (en). */
export function formatMonth(month: string, locale: Locale, short = false): string {
  const [y, m] = month.split("-").map(Number);
  const monthName =
    locale === "bn"
      ? (short ? BN_MONTHS_SHORT : BN_MONTHS)[(m ?? 1) - 1]
      : (short ? EN_MONTHS_SHORT : EN_MONTHS)[(m ?? 1) - 1];
  return localizeDigits(`${monthName} ${y}`, locale);
}

/** 12.5 → "12.5" · 1200 → "1,200" · 1250.75 → "1,250.75" */
export function formatNumber(value: number, locale: Locale, maxDecimals = 2): string {
  const rounded = round2(value);
  const formatted = rounded.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
  return localizeDigits(formatted, locale);
}

/** Money — always 2 decimals: 1200 → "৳1,200.00" */
export function formatMoney(value: number, locale: Locale, withSymbol = true): string {
  const formatted = round2(Math.abs(value)).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const text = localizeDigits(formatted, locale);
  return withSymbol ? `৳${text}` : text;
}

/** Meal counts keep .5 precision without trailing zeros: 2, 2.5, 0.25 */
export function formatMeals(value: number, locale: Locale): string {
  return formatNumber(value, locale, 2);
}

/**
 * Meal rate display — rounds to 2 decimals but keeps sub-taka precision
 * visible (e.g. ৳64.29).
 */
export function formatRate(value: number, locale: Locale): string {
  return formatMoney(value, locale);
}

export function formatPercent(value: number, locale: Locale, decimals = 1): string {
  const formatted = round2(value).toFixed(decimals);
  return `${localizeDigits(formatted, locale)}%`;
}

/** Percentage share of a total, guarding against divide-by-zero. */
export function share(part: number, total: number): number {
  if (!total) return 0;
  return (part / total) * 100;
}

export function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

/** Deterministic warm avatar colour from an id — stays inside the brand family. */
const AVATAR_COLORS = [
  "#f97316",
  "#ea580c",
  "#d97706",
  "#c2410c",
  "#b45309",
  "#fb923c",
  "#a16207",
  "#9a3412",
];

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}
