"use client";

import { useI18n } from "@/components/locale-provider";
import { Button, Card, cx } from "@/components/ui";
import { addDays, formatDate, todayISO } from "@/lib/format";

interface DateNavProps {
  date: string;
  onDateChange: (date: string) => void;
  stats?: Array<{ label: string; value: string }>;
}

/** Big, thumb-friendly day stepper: ◀ date ▶ plus a native date picker. */
export function DateNav({ date, onDateChange, stats }: DateNavProps) {
  const { t, locale } = useI18n();
  const isToday = date === todayISO();

  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onDateChange(addDays(date, -1))}
          aria-label="Previous day"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-lg font-bold text-brand-600 ring-1 ring-line transition-colors hover:bg-surface-3 dark:text-brand-300"
        >
          ‹
        </button>

        <div className="relative min-w-0 flex-1 text-center">
          <p className="pointer-events-none text-[0.65rem] font-bold uppercase tracking-wide text-muted">
            {isToday ? t("common.today") : t("dash.meals.daySelect")}
          </p>
          <p className="tnum truncate text-[0.95rem] font-extrabold text-ink">
            {formatDate(date, locale, { withWeekday: true })}
          </p>
          <input
            type="date"
            value={date}
            onChange={(event) => event.target.value && onDateChange(event.target.value)}
            aria-label={t("common.date")}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        <button
          type="button"
          onClick={() => onDateChange(addDays(date, 1))}
          aria-label="Next day"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-lg font-bold text-brand-600 ring-1 ring-line transition-colors hover:bg-surface-3 dark:text-brand-300"
        >
          ›
        </button>
      </div>

      <div className="mt-3">
        <Button
          size="sm"
          variant={isToday ? "secondary" : "outline"}
          onClick={() => onDateChange(todayISO())}
          block
        >
          <span aria-hidden>📅</span> {t("dash.meals.jumpToday")}
        </Button>
      </div>

      {stats && stats.length > 0 && (
        <div
          className={cx(
            "mt-3 grid divide-x divide-line rounded-2xl bg-surface-2 py-2.5",
            stats.length === 3 ? "grid-cols-3" : "grid-cols-2",
          )}
        >
          {stats.map((stat, index) => (
            <div key={index} className="min-w-0 px-2 text-center">
              <p className="truncate text-[0.6rem] font-bold uppercase tracking-wide text-muted">
                {stat.label}
              </p>
              <p className="tnum mt-0.5 truncate text-sm font-extrabold text-ink">{stat.value}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
