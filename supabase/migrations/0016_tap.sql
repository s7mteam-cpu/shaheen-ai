-- v29 (Nov 2026): Tap Payments — cards renew automatically every month, KNET gets a monthly payment link.

-- Subscriptions now come from Stripe (old) or Tap (new).
alter table public.subscriptions add column if not exists provider text not null default 'stripe';
alter table public.subscriptions add column if not exists pay_method text;              -- 'card' (auto-renew) | 'knet' (monthly link)
alter table public.subscriptions add column if not exists tap_customer_id text;
alter table public.subscriptions add column if not exists tap_card_id text;
alter table public.subscriptions add column if not exists tap_agreement_id text;
alter table public.subscriptions add column if not exists card_label text;              -- e.g. "VISA •••• 4242" (never the full card)
alter table public.subscriptions add column if not exists next_plan_id text references public.plans(id);
alter table public.subscriptions add column if not exists reminded_for timestamptz;     -- the period we already sent a KNET reminder for
alter table public.subscriptions add column if not exists failed_attempts int not null default 0;

-- Every Tap charge (subscribe / renew / managed package). Used to never process a payment twice and as the customer's invoices.
create table if not exists public.tap_charges (
  id text primary key,                          -- chg_…
  user_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('subscribe','renew','managed')),
  plan_id text,
  amount numeric(12,3) not null,
  currency text not null default 'KWD',
  method text,                                  -- KNET / VISA / MASTERCARD / APPLE_PAY …
  status text not null default 'INITIATED',
  processed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tap_charges_user on public.tap_charges(user_id, created_at desc);
alter table public.tap_charges enable row level security;
drop policy if exists "own tap charges" on public.tap_charges;
create policy "own tap charges" on public.tap_charges for select using (user_id = auth.uid() or public.is_admin());

select 'v29 ok' as result, (select count(*) from information_schema.columns where table_name = 'subscriptions' and column_name = 'pay_method') as tap_ready;
