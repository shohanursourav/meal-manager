import { getSupabase } from "./supabase";
import { toNumber } from "./format";
import type { Expense, Meal, Member, Mess } from "./types";

/**
 * Thin, typed data-access layer over Supabase.
 * Every query is scoped by mess_id — the dashboard never reads across messes.
 */

export interface MessSnapshot {
  mess: Mess;
  members: Member[];
  meals: Meal[];
  expenses: Expense[];
}

const MEAL_COLUMNS = "id, mess_id, member_id, date, meal_count, created_at";
const EXPENSE_COLUMNS = "id, mess_id, member_id, date, amount, created_at";

/* ------------------------------- messes --------------------------------- */

export async function createMess(name: string): Promise<Mess> {
  const { data, error } = await getSupabase()
    .from("messes")
    .insert({ name: name.trim() })
    .select("id, name, created_at")
    .single();
  if (error) throw error;
  return data as Mess;
}

export async function getMess(messId: string): Promise<Mess | null> {
  const { data, error } = await getSupabase()
    .from("messes")
    .select("id, name, created_at")
    .eq("id", messId)
    .maybeSingle();
  if (error) throw error;
  return (data as Mess | null) ?? null;
}

export async function renameMess(messId: string, name: string): Promise<void> {
  const { error } = await getSupabase()
    .from("messes")
    .update({ name: name.trim() })
    .eq("id", messId);
  if (error) throw error;
}

/**
 * Deletes a mess. Child rows are removed by `on delete cascade`, but we delete
 * them explicitly so the app still behaves correctly if an older deployment
 * created the tables without the cascade.
 */
export async function deleteMess(messId: string): Promise<void> {
  const supabase = getSupabase();
  for (const table of ["meals", "expenses", "members"] as const) {
    const { error } = await supabase.from(table).delete().eq("mess_id", messId);
    if (error) throw error;
  }
  const { error } = await supabase.from("messes").delete().eq("id", messId);
  if (error) throw error;
}

/* ------------------------------- members -------------------------------- */

export async function addMember(messId: string, name: string): Promise<Member> {
  const { data, error } = await getSupabase()
    .from("members")
    .insert({ mess_id: messId, name: name.trim() })
    .select("id, mess_id, name, created_at")
    .single();
  if (error) throw error;
  return data as Member;
}

export async function deleteMember(memberId: string): Promise<void> {
  const supabase = getSupabase();
  // Remove the member's rows first (members may be referenced by expenses).
  await supabase.from("meals").delete().eq("member_id", memberId);
  await supabase.from("expenses").delete().eq("member_id", memberId);
  const { error } = await supabase.from("members").delete().eq("id", memberId);
  if (error) throw error;
}

export async function renameMember(memberId: string, name: string): Promise<void> {
  const { error } = await getSupabase()
    .from("members")
    .update({ name: name.trim() })
    .eq("id", memberId);
  if (error) throw error;
}

/* -------------------------------- meals --------------------------------- */

export async function getMeals(messId: string): Promise<Meal[]> {
  const { data, error } = await getSupabase()
    .from("meals")
    .select(MEAL_COLUMNS)
    .eq("mess_id", messId)
    .order("date", { ascending: false })
    .limit(5000);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...(row as Meal),
    meal_count: toNumber((row as { meal_count: unknown }).meal_count),
  }));
}

/**
 * Upserts one member's meal count for one day.
 *
 * There is a unique index on (member_id, date), so this is an atomic
 * insert-or-update and cannot create duplicate rows.
 */
export async function upsertMeal(
  messId: string,
  memberId: string,
  date: string,
  mealCount: number,
): Promise<Meal> {
  const { data, error } = await getSupabase()
    .from("meals")
    .upsert(
      { mess_id: messId, member_id: memberId, date, meal_count: mealCount },
      { onConflict: "member_id,date" },
    )
    .select(MEAL_COLUMNS)
    .single();
  if (error) throw error;
  return { ...(data as Meal), meal_count: toNumber((data as { meal_count: unknown }).meal_count) };
}

/** Batch version used by the quick-fill buttons. */
export async function upsertMeals(
  messId: string,
  rows: Array<{ memberId: string; date: string; mealCount: number }>,
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await getSupabase()
    .from("meals")
    .upsert(
      rows.map((row) => ({
        mess_id: messId,
        member_id: row.memberId,
        date: row.date,
        meal_count: row.mealCount,
      })),
      { onConflict: "member_id,date" },
    );
  if (error) throw error;
}

/* ------------------------------ expenses -------------------------------- */

export async function getExpenses(messId: string, limit = 5000): Promise<Expense[]> {
  const { data, error } = await getSupabase()
    .from("expenses")
    .select(EXPENSE_COLUMNS)
    .eq("mess_id", messId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...(row as Expense),
    amount: toNumber((row as { amount: unknown }).amount),
  }));
}

export async function addExpense(input: {
  messId: string;
  memberId: string;
  date: string;
  amount: number;
}): Promise<Expense> {
  const { data, error } = await getSupabase()
    .from("expenses")
    .insert({
      mess_id: input.messId,
      member_id: input.memberId,
      date: input.date,
      amount: input.amount,
    })
    .select(EXPENSE_COLUMNS)
    .single();
  if (error) throw error;
  return { ...(data as Expense), amount: toNumber((data as { amount: unknown }).amount) };
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const { error } = await getSupabase().from("expenses").delete().eq("id", expenseId);
  if (error) throw error;
}

/* ------------------------------ dashboard ------------------------------- */

/** One round trip pair: mess metadata + all rows needed for the three tabs. */
export async function loadMessSnapshot(messId: string): Promise<MessSnapshot | null> {
  const mess = await getMess(messId);
  if (!mess) return null;

  const supabase = getSupabase();
  const [membersRes, mealsRes, expensesRes] = await Promise.all([
    supabase
      .from("members")
      .select("id, mess_id, name, created_at")
      .eq("mess_id", messId)
      .order("created_at", { ascending: true }),
    supabase
      .from("meals")
      .select(MEAL_COLUMNS)
      .eq("mess_id", messId)
      .order("date", { ascending: false })
      .limit(5000),
    supabase
      .from("expenses")
      .select(EXPENSE_COLUMNS)
      .eq("mess_id", messId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  if (membersRes.error) throw membersRes.error;
  if (mealsRes.error) throw mealsRes.error;
  if (expensesRes.error) throw expensesRes.error;

  return {
    mess,
    members: (membersRes.data ?? []) as Member[],
    meals: (mealsRes.data ?? []).map((row) => ({
      ...(row as Meal),
      meal_count: toNumber((row as { meal_count: unknown }).meal_count),
    })),
    expenses: (expensesRes.data ?? []).map((row) => ({
      ...(row as Expense),
      amount: toNumber((row as { amount: unknown }).amount),
    })),
  };
}
