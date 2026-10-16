"use client";

import { useState, type FormEvent } from "react";

import { useI18n } from "@/components/locale-provider";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, cx } from "@/components/ui";
import { formatDate, formatMeals, formatMoney, monthOf, round2, toNumber } from "@/lib/format";
import { describeError } from "@/lib/supabase";
import type { Meal, Member, MessSummary } from "@/lib/types";

import { DateNav } from "./date-nav";
import { useMealSync } from "./use-meal-sync";

interface MealsTabProps {
  messId: string;
  members: Member[];
  meals: Meal[];
  date: string;
  onDateChange: (date: string) => void;
  onAddMember: (name: string) => Promise<Member>;
  onDeleteMember: (memberId: string) => Promise<void>;
  onMealSaved: (memberId: string, date: string, value: number) => void;
  onQuickFill: (value: number, members: Member[], date: string) => Promise<void>;
  summary: MessSummary;
  onError: (message: string) => void;
}

const QUICK_VALUES = [0, 1, 2, 3];

export function MealsTab({
  messId,
  members,
  meals,
  date,
  onDateChange,
  onAddMember,
  onDeleteMember,
  onMealSaved,
  onQuickFill,
  summary,
  onError,
}: MealsTabProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [quickBusy, setQuickBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const month = monthOf(date);
  const mealMap = new Map(meals.map((meal) => [`${meal.member_id}|${meal.date}`, meal.meal_count]));

  const dayMeals = meals
    .filter((meal) => meal.date === date)
    .reduce((acc, meal) => acc + meal.meal_count, 0);

  const monthMeals = meals
    .filter((meal) => monthOf(meal.date) === month)
    .reduce((acc, meal) => acc + meal.meal_count, 0);

  function memberMonthMeals(memberId: string): number {
    return round2(
      meals
        .filter((meal) => meal.member_id === memberId && monthOf(meal.date) === month)
        .reduce((acc, meal) => acc + meal.meal_count, 0),
    );
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setAddError(`${t("common.required")}: ${t("dash.meals.addMember.label")}`);
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      await onAddMember(trimmed);
      setNewName("");
      toast(t("toast.saved"));
    } catch (error) {
      setAddError(describeError(error));
    } finally {
      setAdding(false);
    }
  }

  async function handleQuickFill(value: number) {
    if (members.length === 0) return;
    setQuickBusy(true);
    try {
      await onQuickFill(value, members, date);
      toast(t("dash.meals.preset.applied"));
    } catch (error) {
      onError(describeError(error));
    } finally {
      setQuickBusy(false);
    }
  }

  async function handleDeleteMember(memberId: string) {
    if (!window.confirm(t("dash.meals.deleteMember.confirm"))) return;
    setPendingDelete(memberId);
    try {
      await onDeleteMember(memberId);
    } catch (error) {
      onError(describeError(error));
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="space-y-4">
      <DateNav
        date={date}
        onDateChange={onDateChange}
        stats={[
          { label: t("dash.meals.totalMeals.today"), value: formatMeals(dayMeals, locale) },
          { label: t("dash.meals.totalMeals.month"), value: formatMeals(monthMeals, locale) },
          { label: t("dash.meals.rate"), value: formatMoney(summary.mealRate, locale) },
        ]}
      />

      {/* Add member */}
      <Card>
        <CardHeader
          title={t("dash.meals.addMember.title")}
          subtitle={t("dash.meals.subtitle")}
          icon={<span aria-hidden>🧑‍🤝‍🧑</span>}
        />
        <form onSubmit={handleAddMember} className="space-y-3 p-4" noValidate>
          <Field label={t("dash.meals.addMember.label")} htmlFor="member-name" error={addError}>
            <div className="flex gap-2">
              <Input
                id="member-name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder={t("dash.meals.addMember.placeholder")}
                autoComplete="off"
                maxLength={120}
                invalid={Boolean(addError)}
              />
              <Button type="submit" loading={adding} className="shrink-0 px-5">
                {t("common.add")}
              </Button>
            </div>
          </Field>
        </form>
      </Card>

      {/* Members + steppers */}
      <Card>
        <CardHeader
          title={t("dash.meals.members")}
          subtitle={`${t("dash.meals.date")}: ${formatDate(date, locale, { withWeekday: true })}`}
          icon={<span aria-hidden>🍚</span>}
          action={
            members.length > 0 ? (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={quickBusy}
                  onClick={() => void handleQuickFill(0)}
                >
                  {t("dash.meals.preset.clear")}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={quickBusy}
                  onClick={() => void handleQuickFill(3)}
                >
                  {t("dash.meals.preset.all")}
                </Button>
              </div>
            ) : null
          }
        />

        {members.length === 0 ? (
          <EmptyState
            icon="🧑‍🍳"
            title={t("dash.meals.members.empty")}
            body={t("dash.meals.empty.noMembers")}
          />
        ) : (
          <ul className="divide-y divide-line">
            {members.map((member) => (
              <li key={member.id}>
                <MealRow
                  messId={messId}
                  member={member}
                  date={date}
                  serverValue={mealMap.get(`${member.id}|${date}`) ?? 0}
                  monthMeals={memberMonthMeals(member.id)}
                  onSaved={onMealSaved}
                  onDelete={() => void handleDeleteMember(member.id)}
                  deleting={pendingDelete === member.id}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

    </div>
  );
}

/* -------------------------------------------------------------------------- */

interface MealRowProps {
  messId: string;
  member: Member;
  date: string;
  serverValue: number;
  monthMeals: number;
  onSaved: (memberId: string, date: string, value: number) => void;
  onDelete: () => void;
  deleting: boolean;
}

function MealRow({
  messId,
  member,
  date,
  serverValue,
  monthMeals,
  onSaved,
  onDelete,
  deleting,
}: MealRowProps) {
  const { t, locale } = useI18n();
  const [draft, setDraft] = useState<string | null>(null);

  const { value, status, error, setValue, commit } = useMealSync({
    messId,
    memberId: member.id,
    date,
    serverValue,
    onSaved: (next) => onSaved(member.id, date, next),
  });

  const display = draft ?? formatMeals(value, locale);

  function handleText(next: string) {
    // Accept both Bengali and ASCII digits so the app feels native either way.
    const normalized = next
      .replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)))
      .replace(/[^0-9.]/g, "");
    setDraft(normalized);
    if (normalized === "" || normalized === ".") return;
    setValue(toNumber(normalized));
  }

  function handleBlur() {
    const parsed = draft === null || draft === "" ? value : toNumber(draft);
    setDraft(null);
    commit(parsed);
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200"
        >
          {member.name.trim().slice(0, 2).toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{member.name}</p>
          <p className="tnum text-[0.7rem] text-muted">
            {t("dash.summary.scope.month")}: {formatMeals(monthMeals, locale)} {t("common.meals")}
          </p>
        </div>

        <SaveIndicator status={status} />

        <Button
          size="icon"
          variant="ghost"
          onClick={onDelete}
          loading={deleting}
          aria-label={`${t("common.delete")} — ${member.name}`}
          className="text-muted"
        >
          <span aria-hidden>🗑️</span>
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => commit(round2(value - 1.0))}
          disabled={value <= 0}
          aria-label={`− 1.0 ${t("common.meal")}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-xl font-bold text-brand-600 ring-1 ring-line transition-colors hover:bg-surface-3 disabled:opacity-40 dark:text-brand-300"
        >
          −
        </button>

        <div className="relative flex-1">
          <input
            value={display}
            onChange={(event) => handleText(event.target.value)}
            onBlur={handleBlur}
            onFocus={(event) => event.currentTarget.select()}
            inputMode="decimal"
            aria-label={`${member.name} — ${t("dash.meals.member.meals")}`}
            className={cx(
              "tnum h-11 w-full rounded-2xl border bg-surface-2 text-center text-lg font-extrabold text-ink transition-colors focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500/25",
              status === "error" ? "border-danger" : "border-line focus:border-brand-400",
            )}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-[0.65rem] font-bold uppercase text-muted">
            {t("common.meals")}
          </span>
        </div>

        <button
          type="button"
          onClick={() => commit(round2(value + 1.0))}
          aria-label={`+ 1.0 ${t("common.meal")}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-500 text-xl font-bold text-white shadow-sm transition-colors hover:bg-brand-600 active:bg-brand-700"
        >
          +
        </button>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        {QUICK_VALUES.map((quick) => (
          <button
            key={quick}
            type="button"
            onClick={() => commit(quick)}
            className={cx(
              "tnum h-8 flex-1 rounded-xl text-xs font-bold ring-1 transition-colors",
              Math.abs(value - quick) < 0.001
                ? "bg-brand-500 text-white ring-brand-500"
                : "bg-surface-2 text-ink-soft ring-line hover:bg-surface-3",
            )}
          >
            {formatMeals(quick, locale)}
          </button>
        ))}
      </div>

      {status === "error" && (
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-medium text-danger">
          <span>{error ?? t("toast.error")}</span>
          <button
            type="button"
            className="font-bold underline underline-offset-2"
            onClick={() => commit(value)}
          >
            {t("common.retry")}
          </button>
        </p>
      )}
    </div>
  );
}

function SaveIndicator({ status }: { status: ReturnType<typeof useMealSync>["status"] }) {
  const { t } = useI18n();
  const label = status === "saving" ? t("common.loading") : t("common.save");

  return (
    <span aria-live="polite" className="shrink-0">
      {status === "error" ? (
        <Badge tone="danger" className="!px-1.5">
          ✕
        </Badge>
      ) : status === "saved" ? (
        <Badge tone="success">✓ {t("dash.meals.member.saved")}</Badge>
      ) : status === "dirty" || status === "saving" ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[0.65rem] font-bold text-muted ring-1 ring-line">
          <span
            className={cx(
              "h-1.5 w-1.5 rounded-full bg-brand-500",
              status === "saving" && "animate-pulse",
            )}
          />
          {label}
        </span>
      ) : null}
    </span>
  );
}
