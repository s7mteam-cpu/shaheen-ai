-- v27 (Nov 2026): admin team with per-section permissions + finance (expenses, income).

-- 1) Team: «staff» = limited admin. Full admins keep role 'admin' (and all database powers);
--    staff only get the admin sections ticked for them, and no direct database powers.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user','admin','staff'));
alter table public.profiles add column if not exists admin_perms text[];

-- Customers (and staff) can't change their own role, permissions, credits… through the API.
create or replace function public.protect_profile_columns() returns trigger
language plpgsql as $$
begin
  if auth.role() = 'authenticated' and not public.is_admin() then
    new.role := old.role; new.credits := old.credits; new.plan_id := old.plan_id;
    new.is_suspended := old.is_suspended; new.stripe_customer_id := old.stripe_customer_id;
    new.referred_by := old.referred_by; new.referral_code := old.referral_code;
    new.admin_perms := old.admin_perms;
  end if;
  return new;
end $$;

-- 2) Finance. Only the server (service role) reads and writes these.
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null default current_date,
  vendor text not null,
  category text not null default 'usage' check (category in ('fixed','yearly','usage','other')),
  amount numeric(12,3) not null check (amount >= 0),
  currency text not null default 'USD' check (currency in ('USD','KWD')),
  note text,
  receipt_path text,
  recurring_id uuid,
  period text,
  source text not null default 'manual',
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.expenses enable row level security;
create unique index if not exists expenses_recurring_period on public.expenses(recurring_id, period); -- nulls never clash, so manual lines are free
create unique index if not exists expenses_source_period on public.expenses(source, period) where source not in ('manual', 'recurring');

create table if not exists public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  vendor text not null,
  category text not null check (category in ('fixed','yearly')),
  amount numeric(12,3) not null check (amount >= 0),
  currency text not null default 'USD' check (currency in ('USD','KWD')),
  day_of_month int not null default 1 check (day_of_month between 1 and 28),
  month_of_year int check (month_of_year between 1 and 12),
  starts_on date not null default current_date,
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);
alter table public.recurring_expenses enable row level security;

create table if not exists public.income (
  id uuid primary key default gen_random_uuid(),
  received_on date not null default current_date,
  source text not null default 'manual',
  description text not null,
  customer_id uuid references public.profiles(id) on delete set null,
  customer_name text,
  amount numeric(12,3) not null check (amount >= 0),
  currency text not null default 'KWD' check (currency in ('USD','KWD')),
  method text,
  note text,
  external_ref text unique,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.income enable row level security;

select 'v27 ok' as result,
  (select count(*) from information_schema.columns where table_name = 'profiles' and column_name = 'admin_perms') as perms_column,
  (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('expenses','recurring_expenses','income')) as finance_tables;
