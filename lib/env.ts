/**
 * Public environment flags.
 *
 * This module has NO "use client" directive on purpose: it is imported by both
 * server and client components, and reading `process.env.NEXT_PUBLIC_*` here
 * lets Next inline the values into the browser bundle.
 *
 * (Do not move this check into a "use client" module and call it from a server
 * component — client-module exports become proxies on the server and are always
 * truthy, which silently skips the setup screen.)
 */

export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 20;
