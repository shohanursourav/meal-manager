import { round2, sum } from "./format";
import type { Expense, Meal, Member, MemberSummary, MessSummary } from "./types";

/**
 * Anything with a mess-scoped, member-attributed amount of money.
 * `member_id === null` means the payer was removed — the money still counts
 * toward total expenses, but it belongs to nobody in the breakdown.
 */
type PayerRow = Pick<Expense, "member_id" | "amount">;

type MealRow = Pick<Meal, "member_id" | "meal_count"> & { date?: string };

interface BuildSummaryArgs {
  members: Member[];
  meals: MealRow[];
  expenses: PayerRow[];
}

/**
 * The heart of the app.
 *
 *   meal rate  = total expenses ÷ total meals
 *   meal cost  = member's meals × meal rate   (= total expenses × meal share)
 *   balance    = what the member paid − their meal cost
 *
 * Rounding is handled with the **largest remainder method** (Hamilton
 * apportionment): meal costs are computed in integer paisa, floored per member,
 * and the leftover paisa are handed to the members with the biggest fractional
 * remainders. That guarantees `Σ meal costs === total expenses` to the paisa,
 * so `Σ balances === 0` exactly — the books can never drift, however many
 * awkward decimals (0.25, 0.5, 3.25) are in play.
 *
 * Expenses whose payer was deleted (`member_id === null`) still count toward
 * total expenses and the meal rate; they are simply not attributable to anyone.
 */
export function buildSummary({ members, meals, expenses }: BuildSummaryArgs): MessSummary {
  const totalExpenses = round2(sum(expenses.map((e) => Math.max(0, e.amount))));
  const totalMeals = round2(sum(meals.map((m) => Math.max(0, m.meal_count))));
  const mealRate = totalMeals > 0 ? totalExpenses / totalMeals : 0;

  const mealTotals = new Map<string, { meals: number; days: Set<string>; entries: number }>();
  for (const meal of meals) {
    const current = mealTotals.get(meal.member_id) ?? { meals: 0, days: new Set<string>(), entries: 0 };
    current.meals += Math.max(0, meal.meal_count);
    current.entries += 1;
    if (meal.date) current.days.add(meal.date);
    mealTotals.set(meal.member_id, current);
  }

  const paidTotals = new Map<string, number>();
  for (const expense of expenses) {
    if (!expense.member_id) continue;
    paidTotals.set(expense.member_id, (paidTotals.get(expense.member_id) ?? 0) + Math.max(0, expense.amount));
  }

  const memberMeals = members.map((member) => round2(mealTotals.get(member.id)?.meals ?? 0));
  const mealCosts = apportion(totalExpenses, memberMeals, totalMeals);

  const memberTotals: MemberSummary[] = members.map((member, index) => {
    const mealInfo = mealTotals.get(member.id);
    const paid = round2(paidTotals.get(member.id) ?? 0);
    const mealCost = mealCosts[index] ?? 0;
    return {
      memberId: member.id,
      name: member.name,
      meals: memberMeals[index] ?? 0,
      mealCost,
      paid,
      balance: round2(paid - mealCost),
      entries: mealInfo?.entries ?? 0,
      daysLogged: mealInfo?.days.size ?? 0,
    };
  });

  return {
    totalMeals,
    totalExpenses,
    mealRate: round2(mealRate),
    totalPaid: round2(sum(memberTotals.map((m) => m.paid))),
    memberTotals,
    balanced: memberTotals.every((m) => Math.abs(m.balance) < 0.01),
  };
}

/**
 * Largest remainder (Hamilton) apportionment, in integer paisa.
 *
 * Returns one share per member such that the shares always add up to exactly
 * `totalAmount` — never a paisa more or less — while staying as close as
 * possible to each member's meals ÷ totalMeals proportion.
 *
 * Example: ৳4575.75 over meals [5.5, 5, 3] → [1864.20, 1694.72, 1016.83].
 */
export function apportion(totalAmount: number, weights: number[], weightTotal: number): number[] {
  if (weights.length === 0) return [];
  if (weightTotal <= 0) return weights.map(() => 0);

  const totalPaisa = Math.round(totalAmount * 100);
  const exact = weights.map((weight) => (totalPaisa * Math.max(0, weight)) / weightTotal);
  const floors = exact.map((value) => Math.floor(value));
  let leftover = totalPaisa - floors.reduce((acc, value) => acc + value, 0);

  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  const paisa = [...floors];
  for (const { index } of order) {
    if (leftover <= 0) break;
    paisa[index] = (paisa[index] ?? 0) + 1;
    leftover -= 1;
  }

  return paisa.map((value) => round2(value / 100));
}

export interface MemberRef {
  memberId: string;
  name: string;
}

export interface Transfer {
  from: MemberRef;
  to: MemberRef;
  amount: number;
}

/**
 * Greedy debt simplification: repeatedly match the biggest debtor with the
 * biggest creditor. Produces at most (n − 1) transfers, which is what people
 * actually want to see at the end of the month.
 */
export function simplifyDebts(rows: MemberSummary[], epsilon = 0.01): Transfer[] {
  const debtors = rows
    .filter((r) => r.balance < -epsilon)
    .map((r) => ({ memberId: r.memberId, name: r.name, amount: -r.balance }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = rows
    .filter((r) => r.balance > epsilon)
    .map((r) => ({ memberId: r.memberId, name: r.name, amount: r.balance }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  let guard = 0;

  while (i < debtors.length && j < creditors.length && guard < 1000) {
    guard += 1;
    const debtor = debtors[i]!;
    const creditor = creditors[j]!;
    const amount = round2(Math.min(debtor.amount, creditor.amount));

    if (amount > epsilon) {
      transfers.push({
        from: { memberId: debtor.memberId, name: debtor.name },
        to: { memberId: creditor.memberId, name: creditor.name },
        amount,
      });
    }

    debtor.amount = round2(debtor.amount - amount);
    creditor.amount = round2(creditor.amount - amount);
    if (debtor.amount <= epsilon) i += 1;
    if (creditor.amount <= epsilon) j += 1;
  }

  return transfers;
}

export interface Totals {
  totalMeals: number;
  totalExpenses: number;
  receivable: number;
  payable: number;
}

export function summarizeTotals(rows: MemberSummary[]): Totals {
  const receivable = round2(
    sum(rows.filter((r) => r.balance > 0.01).map((r) => r.balance)),
  );
  const payable = round2(
    sum(rows.filter((r) => r.balance < -0.01).map((r) => -r.balance)),
  );
  return {
    totalMeals: round2(sum(rows.map((r) => r.meals))),
    totalExpenses: round2(sum(rows.map((r) => r.paid))),
    receivable,
    payable,
  };
}

/** Balance banding used for colours/icons across the UI. */
export type BalanceTone = "positive" | "negative" | "zero";

export function balanceTone(balance: number): BalanceTone {
  if (balance > 0.01) return "positive";
  if (balance < -0.01) return "negative";
  return "zero";
}
