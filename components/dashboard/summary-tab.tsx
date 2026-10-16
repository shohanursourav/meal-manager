"use client";

import { useMemo, useState } from "react";

import { useI18n } from "@/components/locale-provider";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, CardHeader, EmptyState, ProgressBar, cx } from "@/components/ui";
import { balanceTone, buildSummary, simplifyDebts, summarizeTotals } from "@/lib/calc";
import {
  formatDate,
  formatMeals,
  formatMoney,
  formatNumber,
  formatPercent,
  formatMonth,
  monthOf,
  share,
} from "@/lib/format";
import type { Expense, Meal, Member, Mess } from "@/lib/types";

import { DateNav } from "./date-nav";

type Scope = "day" | "month" | "all";

interface SummaryTabProps {
  mess: Mess;
  members: Member[];
  meals: Meal[];
  expenses: Expense[];
  date: string;
  onDateChange: (date: string) => void;
  onRefresh: () => void;
}

export function SummaryTab({
  mess,
  members,
  meals,
  expenses,
  date,
  onDateChange,
  onRefresh,
}: SummaryTabProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [scope, setScope] = useState<Scope>("month");
  const [refreshing, setRefreshing] = useState(false);

  const month = monthOf(date);

  const scoped = useMemo(() => {
    if (scope === "day") {
      return {
        meals: meals.filter((meal) => meal.date === date),
        expenses: expenses.filter((expense) => expense.date === date),
      };
    }
    if (scope === "month") {
      return {
        meals: meals.filter((meal) => monthOf(meal.date) === month),
        expenses: expenses.filter((expense) => monthOf(expense.date) === month),
      };
    }
    return { meals, expenses };
  }, [date, expenses, meals, month, scope]);

  const summary = useMemo(
    () =>
      buildSummary({
        members,
        meals: scoped.meals,
        expenses: scoped.expenses,
      }),
    [members, scoped],
  );

  const totals = useMemo(() => summarizeTotals(summary.memberTotals), [summary.memberTotals]);
  const transfers = useMemo(() => simplifyDebts(summary.memberTotals), [summary.memberTotals]);

  const periodLabel =
    scope === "day"
      ? formatDate(date, locale, { withWeekday: true })
      : scope === "month"
        ? formatMonth(month, locale)
        : t("dash.summary.scope.all");

  const hasData = summary.totalMeals > 0 || summary.totalExpenses > 0;

  function copyReport() {
    const lines: string[] = [
      `🏠 ${mess.name} — ${periodLabel}`,
      `${t("dash.summary.rate")}: ${formatMoney(summary.mealRate, locale)} / ${t("common.meal")}`,
      `${t("dash.summary.totalMeals")}: ${formatMeals(summary.totalMeals, locale)}`,
      `${t("dash.summary.totalExpenses")}: ${formatMoney(summary.totalExpenses, locale)}`,
      "",
    ];

    for (const row of summary.memberTotals) {
      const tone = balanceTone(row.balance);
      const label =
        tone === "positive"
          ? `${t("dash.summary.willReturn")} ${formatMoney(row.balance, locale)}`
          : tone === "negative"
            ? `${t("dash.summary.willPay")} ${formatMoney(-row.balance, locale)}`
            : t("dash.summary.settledShort");
      lines.push(
        `• ${row.name} — ${t("dash.summary.columns.meals")} ${formatMeals(row.meals, locale)}, ` +
          `${t("dash.summary.columns.paid")} ${formatMoney(row.paid, locale)}, ` +
          `${t("dash.summary.columns.cost")} ${formatMoney(row.mealCost, locale)} → ${label}`,
      );
    }

    if (transfers.length > 0) {
      lines.push("", `💸 ${t("dash.summary.settlement")}:`);
      for (const transfer of transfers) {
        lines.push(
          `   ${transfer.from.name} → ${transfer.to.name}: ${formatMoney(transfer.amount, locale)}`,
        );
      }
    }

    const text = lines.join("\n");
    const clipboard = navigator.clipboard;
    if (clipboard?.writeText) {
      clipboard
        .writeText(text)
        .then(() => toast(t("dash.summary.copied")))
        .catch(() => window.prompt(t("dash.summary.shareText"), text));
    } else {
      window.prompt(t("dash.summary.shareText"), text);
    }
  }

  return (
    <div className="space-y-4">
      {/* Scope + period */}
      <Card className="p-3.5">
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1 ring-1 ring-line">
          {(["day", "month", "all"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setScope(key)}
              aria-pressed={scope === key}
              className={cx(
                "h-10 rounded-xl text-[0.8rem] font-bold transition-colors",
                scope === key ? "bg-brand-500 text-white shadow-sm" : "text-ink-soft hover:bg-surface-3",
              )}
            >
              {t(`dash.summary.scope.${key}`)}
            </button>
          ))}
        </div>
        <p className="tnum mt-3 text-center text-sm font-extrabold text-ink">{periodLabel}</p>
      </Card>

      {scope !== "all" && <DateNav date={date} onDateChange={onDateChange} />}

      {/* Meal rate hero */}
      <Card className="overflow-hidden">
        <div className="bg-brand-500 px-4 py-5 text-white">
          <p className="text-[0.7rem] font-bold uppercase tracking-wide text-white/80">
            {t("dash.summary.rate")}
          </p>
          {summary.totalMeals > 0 ? (
            <p className="tnum mt-1 text-4xl font-extrabold leading-none">
              {formatMoney(summary.mealRate, locale)}
            </p>
          ) : (
            <p className="mt-1 text-2xl font-extrabold leading-tight">{t("dash.summary.noMeals")}</p>
          )}
          <p className="tnum mt-2 text-xs text-white/85">{t("dash.summary.formula")}</p>
        </div>

        <div className="grid grid-cols-2 divide-x divide-line border-b border-line sm:grid-cols-4">
          <Cell label={t("dash.summary.totalMeals")} value={formatMeals(summary.totalMeals, locale)} />
          <Cell
            label={t("dash.summary.totalExpenses")}
            value={formatMoney(summary.totalExpenses, locale)}
          />
          <Cell
            label={t("dash.summary.receivable")}
            value={formatMoney(totals.receivable, locale)}
            tone="success"
          />
          <Cell
            label={t("dash.summary.payable")}
            value={formatMoney(totals.payable, locale)}
            tone="danger"
          />
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-xs text-muted">
            {summary.balanced && hasData ? t("dash.summary.setSummary") : t("dash.summary.subtitle")}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="outline"
              loading={refreshing}
              onClick={() => {
                setRefreshing(true);
                onRefresh();
                window.setTimeout(() => setRefreshing(false), 900);
              }}
            >
              ⟳
            </Button>
            <Button size="sm" variant="secondary" onClick={copyReport} disabled={!hasData}>
              {t("dash.summary.shareText")}
            </Button>
          </div>
        </div>
      </Card>

      {/* Settlement plan */}
      <Card>
        <CardHeader
          title={t("dash.summary.settlement")}
          subtitle={t("dash.summary.settlement.sub")}
          icon={<span aria-hidden>🤝</span>}
        />
        {transfers.length === 0 ? (
          <EmptyState
            icon="✅"
            title={summary.balanced && hasData ? t("dash.summary.settled") : t("dash.summary.settlement.empty")}
          />
        ) : (
          <ul className="divide-y divide-line">
            {transfers.map((transfer, index) => (
              <li key={index} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
                  {transfer.from.name}
                </span>
                <Badge tone="danger">
                  {t("dash.summary.settlement.from")} {formatMoney(transfer.amount, locale)}
                </Badge>
                <span aria-hidden className="text-brand-500">
                  →
                </span>
                <span className="min-w-0 flex-1 truncate text-right text-sm font-bold text-ink">
                  {transfer.to.name}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Member breakdown */}
      <Card>
        <CardHeader
          title={t("dash.summary.breakdown")}
          subtitle={t("dash.summary.formula")}
          icon={<span aria-hidden>📊</span>}
        />
        {members.length === 0 || !hasData ? (
          <EmptyState icon="📭" title={t("dash.summary.noData")} />
        ) : (
          <ul className="divide-y divide-line">
            {summary.memberTotals.map((row) => {
              const tone = balanceTone(row.balance);
              const mealShare = share(row.meals, summary.totalMeals);
              const covered = row.mealCost > 0 ? Math.min(100, share(row.paid, row.mealCost)) : 100;
              return (
                <li key={row.memberId} className="px-4 py-3.5">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200"
                    >
                      {row.name.trim().slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-ink">{row.name}</p>
                      <p className="tnum text-[0.7rem] text-muted">
                        {formatPercent(mealShare, locale, 0)} {t("dash.summary.columns.meals")} ·{" "}
                        {formatNumber(row.daysLogged, locale, 0)} {t("common.days")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge tone={tone === "positive" ? "success" : tone === "negative" ? "danger" : "neutral"}>
                        {tone === "positive" ? "▲" : tone === "negative" ? "▼" : "="}{" "}
                        {tone === "positive"
                          ? t("dash.summary.willReturn")
                          : tone === "negative"
                            ? t("dash.summary.willPay")
                            : t("dash.summary.settledShort")}
                      </Badge>
                      {tone !== "zero" && (
                        <p
                          className={cx(
                            "tnum mt-1 text-sm font-extrabold",
                            tone === "positive" ? "text-success" : "text-danger",
                          )}
                        >
                          {formatMoney(Math.abs(row.balance), locale)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-surface-2 p-2.5">
                    <MiniStat label={t("dash.summary.columns.meals")} value={formatMeals(row.meals, locale)} />
                    <MiniStat label={t("dash.summary.columns.paid")} value={formatMoney(row.paid, locale)} />
                    <MiniStat
                      label={t("dash.summary.columns.cost")}
                      value={formatMoney(row.mealCost, locale)}
                    />
                  </div>

                  <div className="mt-2.5">
                    <ProgressBar value={covered} tone={covered >= 100 ? "success" : "danger"} />
                    <p className="mt-1.5 text-[0.7rem] leading-relaxed text-muted">
                      {tone === "positive"
                        ? t("dash.summary.hint.positive")
                        : tone === "negative"
                          ? t("dash.summary.hint.negative")
                          : t("dash.summary.hint.zero")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Cell({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "danger";
}) {
  return (
    <div className="p-3">
      <p className="truncate text-[0.6rem] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p
        className={cx(
          "tnum mt-0.5 truncate text-sm font-extrabold",
          tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-ink",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 text-center">
      <p className="truncate text-[0.6rem] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="tnum truncate text-[0.8rem] font-extrabold text-ink">{value}</p>
    </div>
  );
}
