"use client";

import { useI18n } from "@/components/locale-provider";
import { cx } from "@/components/ui";

export type TabKey = "meals" | "expenses" | "summary";

const TABS: Array<{ key: TabKey; labelKey: string; icon: string }> = [
  { key: "meals", labelKey: "dash.tab.meals", icon: "🍚" },
  { key: "expenses", labelKey: "dash.tab.expenses", icon: "🧺" },
  { key: "summary", labelKey: "dash.tab.summary", icon: "📊" },
];

export function TabBar({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  const { t } = useI18n();
  return (
    <nav
      className="sticky top-[65px] z-30 border-b border-line bg-canvas/90 backdrop-blur-md"
      aria-label={t("app.tagline")}
    >
      <div role="tablist" className="mx-auto grid max-w-3xl grid-cols-3 gap-1 px-3 py-2">
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.key}`}
              onClick={() => onChange(tab.key)}
              className={cx(
                "flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1.5 text-[0.8rem] font-bold transition-colors",
                isActive
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-ink-soft hover:bg-surface-2 active:bg-surface-3",
              )}
            >
              <span aria-hidden className="text-base leading-none">
                {tab.icon}
              </span>
              <span className="leading-tight">{t(tab.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
