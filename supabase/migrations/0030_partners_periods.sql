-- v71: الشركاء، السحوبات والإيداعات، الموظفين ورواتبهم، والدورات التشغيلية (صافي الربح لأي فترة).

-- أنواع مصاريف أكثر
alter table public.expenses drop constraint if exists expenses_category_check;
alter table public.expenses add constraint expenses_category_check
  check (category in ('fixed','yearly','usage','other','marketing','salaries','government','setup','operations'));

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  share_percent numeric(6,3) not null default 0 check (share_percent >= 0 and share_percent <= 100),
  email text,
  phone text,
  joined_on date,
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);

-- سحب = الشريك أخذ فلوس من الشركة (من أرباحه). إيداع = الشريك حط فلوس بالشركة (رأس مال أو تمويل).
create table if not exists public.partner_moves (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete restrict,
  kind text not null check (kind in ('withdrawal','capital')),
  amount numeric(12,3) not null check (amount > 0),
  currency text not null default 'KWD' check (currency in ('KWD','USD')),
  moved_on date not null default current_date,
  note text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists partner_moves_date_idx on public.partner_moves (moved_on desc);

create table if not exists public.finance_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  note text,
  created_at timestamptz not null default now()
);

-- الموظفين: بياناتهم كاملة (للإدارة بس). كل دفعة لهم تنسجّل بالمصاريف (رواتب ومستحقات) ومربوطة فيهم.
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  job_title text,
  phone text,
  email text,
  address text,
  civil_id text,
  salary numeric(12,3),
  salary_currency text not null default 'KWD' check (salary_currency in ('KWD','USD')),
  starts_on date,
  ends_on date,
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);
alter table public.expenses add column if not exists employee_id uuid references public.employees(id) on delete set null;
alter table public.expenses add column if not exists pay_kind text;
alter table public.employees enable row level security;
revoke all on public.employees from anon, authenticated;

alter table public.partners enable row level security;
alter table public.partner_moves enable row level security;
alter table public.finance_periods enable row level security;
revoke all on public.partners, public.partner_moves, public.finance_periods from anon, authenticated;

select 'v71 ok' as result;
