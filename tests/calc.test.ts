/**
 * Pure-logic tests for the accounting math. Run with:
 *   npm test
 * (Uses Node's built-in test runner + type stripping — no extra deps.)
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { apportion, balanceTone, buildSummary, simplifyDebts, summarizeTotals } from "../lib/calc";
import { round2, share } from "../lib/format";
import type { Member } from "../lib/types";

function member(id: string, name: string): Member {
  return { id, mess_id: "mess-1", name, created_at: "2026-01-01T00:00:00Z" };
}

const RAKIB = member("m1", "Rakib");
const HASAN = member("m2", "Hasan");
const SAGOR = member("m3", "Sagor");

test("meal rate is total expenses divided by total meals", () => {
  const summary = buildSummary({
    members: [RAKIB, HASAN],
    meals: [
      { member_id: RAKIB.id, meal_count: 30, date: "2026-10-01" },
      { member_id: HASAN.id, meal_count: 20, date: "2026-10-01" },
    ],
    expenses: [
      { member_id: RAKIB.id, amount: 3000 },
      { member_id: HASAN.id, amount: 2000 },
    ],
  });

  assert.equal(summary.totalMeals, 50);
  assert.equal(summary.totalExpenses, 5000);
  assert.equal(summary.mealRate, 100);
  assert.equal(summary.memberTotals[0]!.mealCost, 3000);
  assert.equal(summary.memberTotals[0]!.balance, 0);
  assert.equal(summary.memberTotals[1]!.balance, 0);
  assert.equal(summary.balanced, true);
});

test("members who overpay get money back, members who underpay owe the mess", () => {
  const summary = buildSummary({
    members: [RAKIB, HASAN],
    meals: [
      { member_id: RAKIB.id, meal_count: 30, date: "2026-10-01" },
      { member_id: HASAN.id, meal_count: 30, date: "2026-10-01" },
    ],
    expenses: [
      { member_id: RAKIB.id, amount: 6000 },
      { member_id: HASAN.id, amount: 0 },
    ],
  });

  assert.equal(summary.mealRate, 100);
  const rakib = summary.memberTotals.find((row) => row.memberId === RAKIB.id)!;
  const hasan = summary.memberTotals.find((row) => row.memberId === HASAN.id)!;

  assert.equal(rakib.balance, 3000);
  assert.equal(balanceTone(rakib.balance), "positive");
  assert.equal(hasan.balance, -3000);
  assert.equal(balanceTone(hasan.balance), "negative");
});

test("decimal meal counts (0.5, 2.5) are apportioned correctly", () => {
  const summary = buildSummary({
    members: [RAKIB, HASAN, SAGOR],
    meals: [
      { member_id: RAKIB.id, meal_count: 0.5, date: "2026-10-16" },
      { member_id: HASAN.id, meal_count: 2.5, date: "2026-10-16" },
      { member_id: SAGOR.id, meal_count: 1, date: "2026-10-16" },
    ],
    expenses: [{ member_id: RAKIB.id, amount: 100 }],
  });

  assert.equal(summary.totalMeals, 4);
  assert.equal(summary.mealRate, 25);
  assert.equal(summary.memberTotals[1]!.mealCost, 62.5);
  assert.equal(summary.memberTotals[0]!.balance, 87.5);

  // Balances must always net out to zero.
  const net = round2(summary.memberTotals.reduce((acc, row) => acc + row.balance, 0));
  assert.equal(net, 0);
});

test("balances still net to zero with awkward fractions (rounding drift)", () => {
  const summary = buildSummary({
    members: [RAKIB, HASAN, SAGOR],
    meals: [
      { member_id: RAKIB.id, meal_count: 7.5, date: "2026-10-01" },
      { member_id: HASAN.id, meal_count: 3.25, date: "2026-10-02" },
      { member_id: SAGOR.id, meal_count: 11.75, date: "2026-10-03" },
    ],
    expenses: [
      { member_id: HASAN.id, amount: 1234.57 },
      { member_id: SAGOR.id, amount: 987.65 },
      { member_id: RAKIB.id, amount: 333.33 },
    ],
  });

  const net = round2(summary.memberTotals.reduce((acc, row) => acc + row.balance, 0));
  assert.equal(net, 0, `balances must net to exactly 0, got ${net}`);
  assert.equal(
    round2(summary.memberTotals.reduce((acc, row) => acc + row.mealCost, 0)),
    summary.totalExpenses,
    "apportioned meal costs must add up to the total expenses",
  );
  assert.ok(Math.abs(summary.mealRate - 2555.55 / 22.5) < 0.0001);
});

test("largest-remainder apportionment never loses or invents a paisa", () => {
  // 4575.75 over meals [5.5, 5, 3] (total 13.5) — naive rounding is 1 paisa short.
  const shares = apportion(4575.75, [5.5, 5, 3], 13.5);
  assert.deepEqual(shares, [1864.2, 1694.72, 1016.83]);
  assert.equal(round2(shares.reduce((acc, value) => acc + value, 0)), 4575.75);

  // A third-of-a-taka split across three members.
  const thirds = apportion(1, [1, 1, 1], 3);
  assert.deepEqual(thirds, [0.34, 0.33, 0.33]);
  assert.equal(round2(thirds.reduce((acc, value) => acc + value, 0)), 1);

  // Members with no meals never receive a stray paisa.
  const withZero = apportion(100, [1, 1, 0, 1], 3);
  assert.deepEqual(withZero, [33.34, 33.33, 0, 33.33]);
  assert.equal(round2(withZero.reduce((acc, value) => acc + value, 0)), 100);

  assert.deepEqual(apportion(500, [], 0), []);
  assert.deepEqual(apportion(500, [0, 0], 0), [0, 0]);
});

test("no meals => zero rate and no NaN", () => {
  const summary = buildSummary({
    members: [RAKIB],
    meals: [],
    expenses: [{ member_id: RAKIB.id, amount: 500 }],
  });
  assert.equal(summary.mealRate, 0);
  assert.equal(summary.totalMeals, 0);
  assert.equal(summary.memberTotals[0]!.mealCost, 0);
  assert.equal(summary.memberTotals[0]!.balance, 500);
  assert.equal(Number.isNaN(summary.mealRate), false);
});

test("expenses from a deleted payer still count toward the meal rate", () => {
  const summary = buildSummary({
    members: [RAKIB, HASAN],
    meals: [
      { member_id: RAKIB.id, meal_count: 10, date: "2026-10-01" },
      { member_id: HASAN.id, meal_count: 10, date: "2026-10-01" },
    ],
    expenses: [
      { member_id: null, amount: 1000 }, // orphaned row
      { member_id: RAKIB.id, amount: 1000 },
    ],
  });

  assert.equal(summary.totalExpenses, 2000);
  assert.equal(summary.mealRate, 100);
  assert.equal(summary.memberTotals[0]!.mealCost, 1000);
  assert.equal(summary.memberTotals[1]!.mealCost, 1000);
  // Hasan paid nothing, so he owes; Rakib is square.
  assert.equal(summary.memberTotals[1]!.balance, -1000);
});

test("settlement plan clears every balance with the minimum transfers", () => {
  const summary = buildSummary({
    members: [RAKIB, HASAN, SAGOR],
    meals: [
      { member_id: RAKIB.id, meal_count: 10, date: "2026-10-01" },
      { member_id: HASAN.id, meal_count: 10, date: "2026-10-01" },
      { member_id: SAGOR.id, meal_count: 10, date: "2026-10-01" },
    ],
    expenses: [{ member_id: RAKIB.id, amount: 3000 }],
  });

  const transfers = simplifyDebts(summary.memberTotals);
  assert.equal(transfers.length, 2);
  for (const transfer of transfers) {
    assert.equal(transfer.to.memberId, RAKIB.id);
    assert.ok(transfer.amount > 0);
  }
  assert.equal(
    round2(transfers.reduce((acc, t) => acc + t.amount, 0)),
    2000,
  );
});

test("summarizeTotals splits receivable and payable", () => {
  const rows = [
    { memberId: "a", name: "A", meals: 10, mealCost: 1000, paid: 3000, balance: 2000, entries: 1, daysLogged: 1 },
    { memberId: "b", name: "B", meals: 10, mealCost: 1000, paid: 0, balance: -1000, entries: 1, daysLogged: 1 },
    { memberId: "c", name: "C", meals: 10, mealCost: 1000, paid: 0, balance: -1000, entries: 1, daysLogged: 1 },
  ];
  const totals = summarizeTotals(rows);
  assert.equal(totals.receivable, 2000);
  assert.equal(totals.payable, 2000);
  assert.equal(totals.totalMeals, 30);
});

test("share() never divides by zero", () => {
  assert.equal(share(5, 0), 0);
  assert.equal(share(1, 4), 25);
});
