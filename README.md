# 🍛 Bachelor Mess — Meal & Expense Manager

A production-ready, **mobile-first** web app for sharing meals and bazaar (grocery)
costs in a bachelor mess. **Bengali by default**, with a prominent BN/EN switch,
light/dark themes, and an orange brand palette.

* No sign-up, no passwords — a mess is identified by its UUID in the URL.
* Data lives in **Supabase** (Postgres + PostgREST) behind permissive RLS.
* Zero mock data: every number on screen comes from the database.

---

## 1. Setup in 3 steps

### 1.1 Create the Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Open **SQL Editor → New query**.

### 1.2 Apply the schema

Paste the contents of [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql)
and press **Run**. That single script:

* creates the four tables `messes`, `members`, `meals`, `expenses`;
* adds the unique index `meals (member_id, date)` (makes meal saves idempotent);
* **enables Row Level Security** and adds `for all` policies for the `anon` role
  (SELECT / INSERT / UPDATE / DELETE), as required by a no-login app.

> If you use the Supabase CLI instead: `supabase db push` (migrations live in
> `supabase/migrations/`).

### 1.3 Point the app at the project

```bash
cp .env.example .env.local
```

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

Both values live in **Project Settings → API**. Then:

```bash
npm install
npm run dev      # http://localhost:3000
```

If the env vars are missing, the app shows an orange setup card instead of
crashing — it never renders fake rows.

---

## 2. Using the app

### Landing page `/`

* **Mess Name** + **Create** → inserts into `messes`, reads back the generated
  UUID, remembers it on the device and redirects to
  `/dashboard?mess_id=<uuid>`.
* **Return to a mess** — paste a record ID (UUID is validated both client- and
  server-side).
* **Recent messes** — the last six messes created on this device (localStorage only).

### Dashboard `/dashboard?mess_id=<uuid>`

Everything is scoped to that `mess_id`; the URL can be shared with the other
members of the mess so they all work on the same books.

| Tab | Bengali | What it does |
| --- | --- | --- |
| 1 | **মিল হিসাব** | Add members, set each member's meals for the selected day with `−` / `+` (0.5 steps), type an exact value, or use the `0 · 1 · 2 · 3` quick chips and *সবাই ফুল মিল*. Writes are debounced upserts on `(member_id, date)`. |
| 2 | **বাজার খরচ** | Log a bazaar cost: date, which member paid, amount. Recent expenses are listed with day/month/all filters and can be deleted. |
| 3 | **মাসিক রিপোর্ট** | Meal rate, totals, per-member breakdown and a settlement plan. Scope: this day / this month / all time. |

### The math (tab 3)

```
current meal rate      = total expenses ÷ total meals
member's meal cost     = member's meals × meal rate
member's balance       = what the member paid − their meal cost

balance > 0  →  ফেরত পাবে  (gets money back)
balance < 0  →  দিতে হবে  (owes the mess)
```

Meal cost is apportioned by each member's share of the meals, so the balances
always sum to exactly zero (to the paisa) — the books cannot drift even when
0.5 or 0.25 meals are involved. **Settlement plan** then collapses the balances
into the minimum number of transfers with a greedy largest-debtor /
largest-creditor match.

---

## 3. Tech

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, TypeScript) |
| Styling | Tailwind CSS v4 with CSS variables |
| Fonts | Inter (Latin) + Noto Sans Bengali (বাংলা), self-hosted via `@fontsource` |
| Data | `@supabase/supabase-js` v2 — browser-side, no proxy/server actions |
| Tests | Node's built-in test runner (`npm test`) |

Project layout:

```
app/
  layout.tsx            fonts, theme bootstrap, providers
  page.tsx              landing (create / resume a mess)
  dashboard/page.tsx    validates ?mess_id=, mounts the client dashboard
components/
  landing/              landing screen
  dashboard/            shell, tab bar, meals / expenses / summary tabs
  ui.tsx, modal.tsx     design-system primitives (orange, touch-sized)
lib/
  supabase.ts           browser client + error humaniser
  data.ts               typed queries (every one scoped by mess_id)
  calc.ts               meal rate, balances, debt simplification
  format.ts, i18n.ts    Bengali numerals/dates, full BN + EN dictionary
supabase/migrations/    SQL schema + RLS policies
tests/                  pure-logic tests for the accounting math
```

### Brand rules honoured

* **Orange everywhere** — `--color-brand-*` (`#f97316` → `#c2410c`) drives active
  tabs, primary buttons, focus rings, badges and alerts. There is not a single
  blue element, and focus rings/native control accents are forced to orange.
* Bengali (Noto Sans Bengali) is the default UI language, with Bengali numerals
  (৳১,২৫০.০০) and Bengali month names; **EN** switches the whole UI instantly.
* Light/dark toggle with no flash on load (theme is applied by an inline script
  before first paint), and it follows the OS preference until overridden.
* Cards, 44px+ touch targets, sticky header + tab bar, bottom sheets on mobile.

---

## 4. Scripts

```bash
npm run dev        # dev server on 0.0.0.0:3000
npm run build      # production build
npm start          # serve the production build
npm run typecheck  # tsc --noEmit
npm test           # accounting-math unit tests
```

## 5. Deploying

Any Next.js host works (Vercel is one click). Add the two
`NEXT_PUBLIC_SUPABASE_*` variables to the host's environment settings — they are
public by design (they ship in the browser bundle), so RLS is what protects the
data.

## 6. Hardening (optional)

The requested policy is "anonymous read/write", which means anyone with your
project URL + anon key can read or write these tables. That is fine for a
meal-tracking app, but if you want more privacy you can either

* move the app behind Supabase Auth and switch the policies to
  `using (mess_id in (select ...))`-style checks per user, or
* add a shared `mess_token` column and restrict rows to
  `using (mess_token = current_setting('request.headers')::json->>'x-mess-token')`.

The data layer in `lib/data.ts` is the only place that talks to Supabase, so
either change stays contained.
