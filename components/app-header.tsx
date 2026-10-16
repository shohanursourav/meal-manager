"use client";

import Link from "next/link";
import { useI18n } from "./locale-provider";
import { LocaleToggle, ThemeToggle } from "./toggles";

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label={t("app.name")}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-500 text-lg text-white shadow-sm">
            🍛
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[0.95rem] font-extrabold leading-tight text-ink">
              {t("app.name")}
            </span>
            <span className="block truncate text-[0.7rem] font-medium text-muted">
              {subtitle ?? t("app.tagline")}
            </span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
