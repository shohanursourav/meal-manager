"use client";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { useI18n } from "./locale-provider";

/**
 * Shown instead of the app when NEXT_PUBLIC_SUPABASE_* env vars are absent, so
 * a fresh clone explains itself instead of throwing runtime errors.
 */
export function ConfigNotice() {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-5 py-12">
      <div className="card p-5">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-2xl dark:bg-brand-500/15">
          🔌
        </span>
        <h1 className="mt-3 text-lg font-extrabold text-ink">{t("config.missing.title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t("config.missing.body")}</p>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-surface-2 p-4 text-xs leading-relaxed text-ink-soft ring-1 ring-line">
{`# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>`}
        </pre>
        <ol className="mt-4 space-y-2 text-sm text-ink-soft">
          <li>
            1. Create a project at{" "}
            <a
              className="font-semibold text-brand-600 underline decoration-brand-300 underline-offset-2 dark:text-brand-400"
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
            >
              supabase.com/dashboard
            </a>
          </li>
          <li>
            2. Run <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">supabase/migrations/0001_init.sql</code>{" "}
            in the SQL editor
          </li>
          <li>3. Project Settings → API → copy the Project URL and anon key</li>
          <li>4. Restart the dev server</li>
        </ol>
        <p className="mt-4 text-xs text-muted">
          {SUPABASE_URL ? "URL detected ✔" : "URL missing ✖"} ·{" "}
          {SUPABASE_ANON_KEY ? "anon key detected ✔" : "anon key missing ✖"}
        </p>
      </div>
    </main>
  );
}
