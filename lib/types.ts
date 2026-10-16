/**
 * Database row types for the four Supabase tables.
 *
 * NOTE: `numeric` columns are serialised by PostgREST as JSON numbers, but we
 * still defensively coerce them with `toNumber()` (see lib/format.ts) because
 * values can arrive as strings depending on the PostgREST/aggregate path.
 */

export type Locale = "bn" | "en";

export interface Mess {
  id: string;
  name: string;
  created_at: string;
}

export interface Member {
  id: string;
  mess_id: string;
  name: string;
  created_at: string;
}

export interface Meal {
  id: string;
  mess_id: string;
  member_id: string;
  date: string; // YYYY-MM-DD
  meal_count: number;
  created_at?: string;
}

export interface Expense {
  id: string;
  mess_id: string;
  member_id: string | null;
  date: string; // YYYY-MM-DD
  amount: number;
  created_at?: string;
}

export interface MemberSummary {
  memberId: string;
  name: string;
  meals: number;
  mealCost: number;
  paid: number;
  /** paid - mealCost. Negative => the member owes the mess. */
  balance: number;
  entries: number;
  daysLogged: number;
}

export interface MessSummary {
  totalMeals: number;
  totalExpenses: number;
  mealRate: number;
  totalPaid: number;
  memberTotals: MemberSummary[];
  balanced: boolean;
}

/** Raw shape returned by supabase-js before coercion. */
export type RawMeal = Omit<Meal, "meal_count"> & { meal_count: number | string };
export type RawExpense = Omit<Expense, "amount"> & { amount: number | string };
