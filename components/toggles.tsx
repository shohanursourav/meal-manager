"use client";

import { useI18n } from "./locale-provider";
import { useTheme } from "./theme-provider";
import { cx } from "./ui";

/** Prominent BN / EN switch — Bengali is the default. */
export function LocaleToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  return (
    <div
      role="group"
      aria-label="Language"
      className={cx(
        "inline-flex items-center rounded-full bg-surface-2 p-1 ring-1 ring-line",
        className,
      )}
    >
      {(["bn", "en"] as const).map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            className={cx(
              "min-w-[3.25rem] rounded-full px-3 py-1.5 text-sm font-bold transition-colors",
              active
                ? "bg-brand-500 text-white shadow-sm"
                : "text-ink-soft hover:bg-surface-3",
            )}
          >
            {code === "bn" ? "বাংলা" : "EN"}
          </button>
        );
      })}
    </div>
  );
}

/** Light / dark switch. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Light mode" : "Dark mode";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cx(
        "grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-lg ring-1 ring-line transition-colors hover:bg-surface-3",
        className,
      )}
    >
      <span aria-hidden>{isDark ? "☀️" : "🌙"}</span>
      <span className="sr-only">{isDark ? "Switch to light mode" : "Switch to dark mode"}</span>
    </button>
  );
}
