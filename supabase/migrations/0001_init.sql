-- ============================================================================
--  Bachelor Mess — Meal & Expense Manager
--  Migration 0001: schema + Row Level Security (anonymous, no-login app)
-- ============================================================================
--  Run this once in your Supabase project:
--    Supabase Dashboard → SQL Editor → New query → paste → Run
--
--  NOTE ON SECURITY
--  This app is intentionally login-free. The policies below therefore allow the
--  `anon` role to read/write rows. Anyone holding your anon key (which ships in
--  the browser bundle) can access the data, so treat the anon key as
--  "publishable" and never store anything sensitive in these tables.
--  See README.md → "Hardening (optional)" for a shared-secret variant.
-- ============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- 1. messes
-- ---------------------------------------------------------------------------
create table if not exists public.messes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. members
-- ---------------------------------------------------------------------------
create table if not exists public.members (
  id         uuid primary key default gen_random_uuid(),
  mess_id    uuid not null references public.messes (id) on delete cascade,
  name       text not null check (length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);

create index if not exists members_mess_id_idx on public.members (mess_id);

-- ---------------------------------------------------------------------------
-- 3. meals  (one row per member per day — kept in sync by the app)
-- ---------------------------------------------------------------------------
create table if not exists public.meals (
  id         uuid primary key default gen_random_uuid(),
  mess_id    uuid not null references public.messes (id) on delete cascade,
  member_id  uuid not null references public.members (id) on delete cascade,
  date       date not null,
  meal_count numeric(6, 2) not null default 0 check (meal_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists meals_mess_date_idx on public.meals (mess_id, date);
create unique index if not exists meals_member_date_key on public.meals (member_id, date);

-- ---------------------------------------------------------------------------
-- 4. expenses  (bazaar log — many rows per day allowed)
-- ---------------------------------------------------------------------------
-- member_id is nullable with `on delete set null` so that removing a member
-- never destroys the mess's financial history.
create table if not exists public.expenses (
  id         uuid primary key default gen_random_uuid(),
  mess_id    uuid not null references public.messes (id) on delete cascade,
  member_id  uuid references public.members (id) on delete set null,
  date       date not null,
  amount     numeric(12, 2) not null default 0 check (amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists expenses_mess_date_idx on public.expenses (mess_id, date);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.messes   enable row level security;
alter table public.members  enable row level security;
alter table public.meals    enable row level security;
alter table public.expenses enable row level security;

-- Drop-then-create so the migration is safely re-runnable.
drop policy if exists "anon all messes"   on public.messes;
drop policy if exists "anon all members"  on public.members;
drop policy if exists "anon all meals"    on public.meals;
drop policy if exists "anon all expenses" on public.expenses;

create policy "anon all messes" on public.messes
  for all to anon, authenticated
  using (true) with check (true);

create policy "anon all members" on public.members
  for all to anon, authenticated
  using (true) with check (true);

create policy "anon all meals" on public.meals
  for all to anon, authenticated
  using (true) with check (true);

create policy "anon all expenses" on public.expenses
  for all to anon, authenticated
  using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Grants (Supabase normally does this already — belt and braces)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant all on public.messes, public.members, public.meals, public.expenses to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime (optional — lets other phones in the same mess see updates live)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.members;
      alter publication supabase_realtime add table public.meals;
      alter publication supabase_realtime add table public.expenses;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
