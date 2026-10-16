import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

/**
 * Browser Supabase client.
 *
 * Env vars are read from the standard `NEXT_PUBLIC_*` names so they are inlined
 * at build time (works on Vercel, Netlify, or plain `next start`).
 *
 * If they are missing the app renders a setup screen instead of crashing —
 * see components/config-notice.tsx.
 */
export { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured };

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local",
    );
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { "x-application-name": "meal-manager" },
      },
      db: { schema: "public" },
    });
  }
  return client;
}

/** Human-friendly message from a Postgres / network error. */
export function describeError(error: unknown): string {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  const anyError = error as { message?: string; details?: string; hint?: string; code?: string };
  const parts = [anyError.message, anyError.details, anyError.hint].filter(Boolean);
  const base = parts.join(" · ") || "Unknown error";
  if (anyError.code === "42P01") {
    return `${base} — have you run supabase/migrations/0001_init.sql?`;
  }
  if (anyError.code === "42501" || /row-level security/i.test(base)) {
    return `${base} — check the RLS policies in supabase/migrations/0001_init.sql`;
  }
  return base;
}
