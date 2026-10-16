"use client";

import { useMemo, useState, type FormEvent } from "react";

import { useI18n } from "@/components/locale-provider";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  MoneyInput,
  Select,
  cx,
} from "@/components/ui";
import { formatDate, formatMoney, formatNumber, monthOf, toNumber } from "@/lib/format";
import { describeError } from "@/lib/supabase";
import type { Expense, Member } from "@/lib/types";

import { DateNav } from "./date-nav";

type RangeFilter = "day" | "month" | "all";

interface ExpensesTabProps {
  members: Member[];
  expenses: Expense[];
  date: string;
  onDateChange: (date: string) => void;
  onAddExpense: (input: { memberId: string; date: string; amount: number }) => Promise<Expense>;
  onDeleteExpense: (expenseId: string) => Promise<void>;
  onError: (message: string) => void;
}

export function ExpensesTab({
  members,
  expenses,
  date,
  onDateChange,
  onAddExpense,
  onDeleteExpense,
  onError,
}: ExpensesTabProps) {
  const { t, locale } = useI18n();

  const [memberId, setMemberId] = useState<string>(members[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeFilter>("month");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const month = monthOf(date);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  // A member can be deleted in another tab / another phone: fall back to the
  // first member so the form can never submit an orphaned id.
  const activeMemberId = memberById.has(memberId) ? memberId : (members[0]?.id ?? "");

  const dayTotal = expenses
    .filter((expense) => expense.date === date)
    .reduce((acc, expense) => acc + expense.amount, 0);

  const monthTotal = expenses
    .filter((expense) => monthOf(expense.date) === month)
    .reduce((acc, expense) => acc + expense.amount, 0);

  const visible = useMemo(() => {
    const filtered = expenses.filter((expense) => {
      if (range === "day") return expense.date === date;
      if (range === "month") return monthOf(expense.date) === month;
      return true;
    });
    return filtered.slice(0, 60);
  }, [date, expenses, month, range]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = toNumber(amount);
    if (!activeMemberId) {
      setFormError(`${t("common.required")}: ${t("dash.expenses.member")}`);
      return;
    }
    if (!parsed || parsed <= 0) {
      setFormError(`${t("common.required")}: ${t("dash.expenses.amount")}`);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await onAddExpense({ memberId: activeMemberId, date, amount: parsed });
      setAmount("");
    } catch (error) {
      setFormError(describeError(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(expenseId: string) {
    setDeletingId(expenseId);
    try {
      await onDeleteExpense(expenseId);
    } catch (error) {
      onError(describeError(error));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <DateNav
        date={date}
        onDateChange={onDateChange}
        stats={[
          { label: t("common.today"), value: formatMoney(dayTotal, locale) },
          { label: t("dash.expenses.monthTotal"), value: formatMoney(monthTotal, locale) },
        ]}
      />

      <Card>
        <CardHeader
          title={t("dash.expenses.title")}
          subtitle={t("dash.expenses.subtitle")}
          icon={<span aria-hidden>🧺</span>}
        />

        {members.length === 0 ? (
          <EmptyState
            icon="🧑‍🍳"
            title={t("dash.meals.members.empty")}
            body={t("dash.meals.empty.noMembers")}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 p-4" noValidate>
            <Field label={t("dash.expenses.date")} htmlFor="expense-date">
              <input
                id="expense-date"
                type="date"
                value={date}
                onChange={(event) => event.target.value && onDateChange(event.target.value)}
                className="h-12 w-full rounded-2xl border border-line bg-surface-2 px-3.5 text-base text-ink focus:border-brand-400 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500/25"
              />
            </Field>

            <Field label={t("dash.expenses.member")} htmlFor="expense-member">
              <Select
                id="expense-member"
                value={activeMemberId}
                onChange={(event) => setMemberId(event.target.value)}
              >
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t("dash.expenses.amount")} htmlFor="expense-amount" error={formError}>
              <MoneyInput
                id="expense-amount"
                value={amount}
                onChange={(event) => {
                  const normalized = event.target.value
                    .replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)))
                    .replace(/[^0-9.]/g, "");
                  setAmount(normalized);
                }}
                placeholder={t("dash.expenses.amount.placeholder")}
                enterKeyHint="done"
                invalid={Boolean(formError)}
              />
            </Field>

            <Button type="submit" size="lg" block loading={submitting}>
              {submitting ? t("dash.expenses.adding") : t("dash.expenses.submit")}
            </Button>

            <p className="rounded-2xl bg-brand-50 px-3.5 py-3 text-xs leading-relaxed text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
              <strong className="font-bold">{t("dash.expenses.note.title")}: </strong>
              {t("dash.expenses.note.body")}
            </p>
          </form>
        )}
      </Card>

      <Card>
        <CardHeader
          title={t("dash.expenses.recent")}
          subtitle={`${formatNumber(visible.length, locale, 0)} / ${formatNumber(expenses.length, locale, 0)}`}
          icon={<span aria-hidden>🧾</span>}
          action={
            <div className="inline-flex rounded-full bg-surface-2 p-1 ring-1 ring-line">
              {(["day", "month", "all"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRange(key)}
                  className={cx(
                    "rounded-full px-2.5 py-1 text-[0.7rem] font-bold transition-colors",
                    range === key ? "bg-brand-500 text-white" : "text-ink-soft hover:bg-surface-3",
                  )}
                >
                  {key === "day"
                    ? t("dash.expenses.filter.day")
                    : key === "month"
                      ? t("dash.expenses.filter.month")
                      : t("dash.expenses.filter.all")}
                </button>
              ))}
            </div>
          }
        />

        {visible.length === 0 ? (
          <EmptyState
            icon="🧾"
            title={expenses.length === 0 ? t("dash.expenses.emptyAll") : t("dash.expenses.empty")}
          />
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((expense) => {
              const member = expense.member_id ? memberById.get(expense.member_id) : undefined;
              return (
                <li key={expense.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200"
                  >
                    {member ? member.name.trim().slice(0, 2).toUpperCase() : "—"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">
                      {member?.name ?? t("common.none")}
                    </p>
                    <p className="tnum truncate text-[0.7rem] text-muted">
                      {formatDate(expense.date, locale)}
                    </p>
                  </div>
                  <p className="tnum shrink-0 text-sm font-extrabold text-ink">
                    {formatMoney(expense.amount, locale)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleDelete(expense.id)}
                    disabled={deletingId === expense.id}
                    aria-label={t("common.delete")}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 disabled:opacity-50"
                  >
                    {deletingId === expense.id ? "…" : "✕"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {members.length > 0 && (
        <div className="flex justify-center">
          <Badge tone="neutral">
            {t("dash.expenses.monthTotal")}: {formatMoney(monthTotal, locale)}
          </Badge>
        </div>
      )}
    </div>
  );
}
