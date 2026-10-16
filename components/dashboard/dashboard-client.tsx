"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { useI18n } from "@/components/locale-provider";
import { useToast } from "@/components/toast";
import { Button, Card, EmptyState, Skeleton } from "@/components/ui";
import { buildSummary } from "@/lib/calc";
import {
  addExpense,
  addMember,
  deleteExpense,
  deleteMember,
  loadMessSnapshot,
  upsertMeals,
  type MessSnapshot,
} from "@/lib/data";
import { monthOf, todayISO } from "@/lib/format";
import { rememberMess } from "@/lib/recent";
import { describeError } from "@/lib/supabase";
import type { Expense, Meal, Member } from "@/lib/types";

import { ExpensesTab } from "./expenses-tab";
import { MealsTab } from "./meals-tab";
import { MessIntro } from "./mess-intro";
import { SummaryTab } from "./summary-tab";
import { TabBar, type TabKey } from "./tab-bar";
import { useMessRealtimeRefresh } from "./use-meal-sync";

interface DashboardClientProps {
  messId: string;
}

/**
 * Dashboard shell. Owns the single source of truth (`snapshot`) and hands the
 * three tabs a small, explicitly-typed mutation API. Every write goes straight
 * to Supabase and the local cache is patched with the returned row, so the UI
 * never shows data that was not persisted.
 */
export function DashboardClient({ messId }: DashboardClientProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();

  const [snapshot, setSnapshot] = useState<MessSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<TabKey>("meals");
  const [date, setDate] = useState(() => todayISO());

  /** Applies a freshly fetched snapshot to the UI state. */
  const applySnapshot = useCallback((next: MessSnapshot | null) => {
    if (!next) {
      setNotFound(true);
      setSnapshot(null);
      return;
    }
    setNotFound(false);
    setLoadError(null);
    setSnapshot(next);
    rememberMess(next.mess);
  }, []);

  // Initial load. The first setState happens after an await, so the effect body
  // itself stays free of synchronous state updates.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await loadMessSnapshot(messId);
        if (!cancelled) applySnapshot(next);
      } catch (error) {
        if (!cancelled) setLoadError(describeError(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applySnapshot, messId]);

  /** Manual / background refresh (never shows the full-page skeleton). */
  const refresh = useCallback(async () => {
    try {
      applySnapshot(await loadMessSnapshot(messId));
    } catch (error) {
      toast(describeError(error), "error");
    }
  }, [applySnapshot, messId, toast]);

  const refreshSilently = useCallback(() => {
    void refresh();
  }, [refresh]);

  /** Retry after a failed initial load, with the skeleton visible again. */
  const retry = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        applySnapshot(await loadMessSnapshot(messId));
      } catch (error) {
        setLoadError(describeError(error));
      } finally {
        setLoading(false);
      }
    })();
  }, [applySnapshot, messId]);

  useMessRealtimeRefresh(refreshSilently, Boolean(snapshot));

  /* ------------------------------ mutations ------------------------------ */

  const handleAddMember = useCallback(
    async (name: string) => {
      const member = await addMember(messId, name);
      setSnapshot((prev) => (prev ? { ...prev, members: [...prev.members, member] } : prev));
      return member;
    },
    [messId],
  );

  const handleDeleteMember = useCallback(async (memberId: string) => {
    await deleteMember(memberId);
    setSnapshot((prev) =>
      prev
        ? {
            ...prev,
            members: prev.members.filter((m) => m.id !== memberId),
            meals: prev.meals.filter((m) => m.member_id !== memberId),
            expenses: prev.expenses.filter((e) => e.member_id !== memberId),
          }
        : prev,
    );
  }, []);

  const handleMealSaved = useCallback(
    (memberId: string, mealDate: string, value: number) => {
      setSnapshot((prev) => {
        if (!prev) return prev;
        const index = prev.meals.findIndex((m) => m.member_id === memberId && m.date === mealDate);
        if (index >= 0) {
          const meals = [...prev.meals];
          meals[index] = { ...meals[index]!, meal_count: value };
          return { ...prev, meals };
        }
        if (value === 0) return prev;
        const optimistic: Meal = {
          id: `local-${memberId}-${mealDate}`,
          mess_id: messId,
          member_id: memberId,
          date: mealDate,
          meal_count: value,
        };
        return { ...prev, meals: [...prev.meals, optimistic] };
      });
    },
    [messId],
  );

  const handleQuickFill = useCallback(
    async (value: number, members: Member[], mealDate: string) => {
      await upsertMeals(
        messId,
        members.map((member) => ({ memberId: member.id, date: mealDate, mealCount: value })),
      );
      setSnapshot((prev) => {
        if (!prev) return prev;
        const others = prev.meals.filter((m) => m.date !== mealDate);
        const next: Meal[] = members.map((member) => {
          const existing = prev.meals.find((m) => m.member_id === member.id && m.date === mealDate);
          return {
            id: existing?.id ?? `local-${member.id}-${mealDate}`,
            mess_id: messId,
            member_id: member.id,
            date: mealDate,
            meal_count: value,
          };
        });
        return { ...prev, meals: [...others, ...next] };
      });
    },
    [messId],
  );

  const handleAddExpense = useCallback(
    async (input: { memberId: string; date: string; amount: number }) => {
      const row = await addExpense({ messId, ...input });
      setSnapshot((prev) => (prev ? { ...prev, expenses: [row, ...prev.expenses] } : prev));
      return row;
    },
    [messId],
  );

  const handleDeleteExpense = useCallback(async (expenseId: string) => {
    await deleteExpense(expenseId);
    setSnapshot((prev) =>
      prev ? { ...prev, expenses: prev.expenses.filter((e) => e.id !== expenseId) } : prev,
    );
  }, []);

  /* ------------------------------- derived ------------------------------- */

  const summary = useMemo(() => {
    if (!snapshot) return null;
    return buildSummary({
      members: snapshot.members,
      meals: snapshot.meals,
      expenses: snapshot.expenses as Array<Pick<Expense, "member_id" | "amount">>,
    });
  }, [snapshot]);

  const month = monthOf(date);

  const monthMeals = useMemo(() => {
    if (!snapshot) return 0;
    return snapshot.meals
      .filter((meal) => monthOf(meal.date) === month)
      .reduce((acc, meal) => acc + meal.meal_count, 0);
  }, [month, snapshot]);

  /* -------------------------------- states ------------------------------- */

  if (notFound) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <Card>
            <EmptyState
              icon="🔍"
              title={t("dashboard.notFound")}
              body={t("dashboard.notFound.body")}
              action={<Button onClick={() => router.push("/")}>{t("error.home")}</Button>}
            />
          </Card>
        </main>
      </>
    );
  }

  if (loading && !snapshot) {
    return (
      <>
        <AppHeader subtitle={t("dashboard.loading")} />
        <main className="mx-auto max-w-3xl space-y-3 px-4 py-5">
          <Skeleton className="h-24" />
          <Skeleton className="h-14" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </main>
      </>
    );
  }

  if (loadError && !snapshot) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <Card>
            <EmptyState
              icon="⚠️"
              title={t("error.title")}
              body={loadError}
              action={
                <Button variant="secondary" onClick={retry}>
                  {t("common.retry")}
                </Button>
              }
            />
          </Card>
        </main>
      </>
    );
  }

  if (!snapshot || !summary) return null;

  return (
    <>
      <AppHeader subtitle={snapshot.mess.name} />

      <MessIntro
        mess={snapshot.mess}
        summary={summary}
        memberCount={snapshot.members.length}
        monthMeals={monthMeals}
        onRenamed={(name) =>
          setSnapshot((prev) => (prev ? { ...prev, mess: { ...prev.mess, name } } : prev))
        }
        onDeleted={() => {
          toast(t("toast.deleted"));
          router.push("/");
        }}
      />

      <TabBar active={tab} onChange={setTab} />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
        <div
          id={`panel-${tab}`}
          role="tabpanel"
          className="animate-rise space-y-4"
          key={tab /* remount on tab change so each panel starts clean */}
        >
          {tab === "meals" && (
            <MealsTab
              members={snapshot.members}
              meals={snapshot.meals}
              date={date}
              onDateChange={setDate}
              onAddMember={handleAddMember}
              onDeleteMember={handleDeleteMember}
              onMealSaved={handleMealSaved}
              onQuickFill={handleQuickFill}
              messId={messId}
              summary={summary}
              onError={(message) => toast(message, "error")}
            />
          )}

          {tab === "expenses" && (
            <ExpensesTab
              members={snapshot.members}
              expenses={snapshot.expenses}
              date={date}
              onDateChange={setDate}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              onError={(message) => toast(message, "error")}
            />
          )}

          {tab === "summary" && (
            <SummaryTab
              mess={snapshot.mess}
              members={snapshot.members}
              meals={snapshot.meals}
              expenses={snapshot.expenses}
              date={date}
              onDateChange={setDate}
              onRefresh={refreshSilently}
            />
          )}
        </div>
      </main>
    </>
  );
}
