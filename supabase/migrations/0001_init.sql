-- ============================================================
-- Shaheen (S7M) — initial schema
-- Run in Supabase SQL editor or with `supabase db push`.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Profiles (one per auth user) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  instagram text,
  role text not null default 'user' check (role in ('user','admin')),
  credits integer not null default 0 check (credits >= 0),
  plan_id text,
  is_suspended boolean not null default false,
  referral_code text unique default substr(md5(gen_random_uuid()::text), 1, 8),
  referred_by uuid references public.profiles(id),
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

-- ---------- Plans (editable from admin) ----------
create table public.plans (
  id text primary key,                       -- e.g. 'starter'
  name text not null,
  subtitle text,
  price_kwd numeric(10,3) not null,
  credits integer not null,
  features text[] not null default '{}',
  stripe_price_id text,                      -- Stripe recurring price (KWD)
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

-- ---------- Subscriptions (mirrors Stripe) ----------
create table public.subscriptions (
  id text primary key,                       -- Stripe subscription id
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text references public.plans(id),
  status text not null,                      -- active, past_due, canceled, paused ...
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
create index on public.subscriptions(user_id);

-- ---------- Tools (editable from admin) ----------
create table public.tools (
  id text primary key,                       -- e.g. 'product-photo'
  name text not null,
  description text not null default '',
  category text not null check (category in ('image','video','audio')),
  icon text not null default 'sparkles',
  credit_cost integer not null default 1,    -- per unit (image, 10 seconds, 500 chars ...)
  cost_unit text not null default 'طلب',
  provider_model text,                       -- e.g. fal-ai/nano-banana-pro/edit
  is_enabled boolean not null default true,
  sort_order integer not null default 0
);

-- ---------- Jobs = every generation = "أعمالي" ----------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tool_id text not null references public.tools(id),
  title text,
  input jsonb not null default '{}',
  output jsonb,                              -- { files: [{url, type}] }
  status text not null default 'queued' check (status in ('queued','running','done','failed')),
  error text,
  credits_charged integer not null default 0,
  refunded boolean not null default false,
  provider_request_id text,
  provider_cost_usd numeric(10,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.jobs(user_id, created_at desc);
create index on public.jobs(status);
create index on public.jobs(provider_request_id);

-- ---------- Credit ledger (every movement) ----------
create table public.credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,                   -- + grant / - spend
  reason text not null check (reason in ('subscription','renewal_reset','spend','refund','admin','referral')),
  job_id uuid references public.jobs(id),
  ref text,                                  -- stripe invoice id, admin note ...
  created_at timestamptz not null default now()
);
create unique index ledger_ref_unique on public.credit_ledger(ref, reason) where ref is not null;
create index on public.credit_ledger(user_id, created_at desc);

-- ---------- Brand kit ----------
create table public.brand_kits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  business_name text,
  logo_url text,
  colors text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- ---------- Site content (CMS, editable from admin) ----------
create table public.site_content (
  key text primary key,                      -- e.g. 'hero', 'faq', 'footer'
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  tool_id text references public.tools(id),
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image','video')),
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Helpers
-- ============================================================
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- New auth user -> profile
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare ref_id uuid;
begin
  if new.raw_user_meta_data ? 'ref' then
    select id into ref_id from profiles where referral_code = new.raw_user_meta_data->>'ref';
  end if;
  insert into profiles (id, email, full_name, referred_by)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
          ref_id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomic spend: checks balance, deducts, writes ledger. Raises if not enough.
create or replace function public.spend_credits(p_user uuid, p_amount int, p_job uuid)
returns int language plpgsql security definer set search_path = public as $$
declare new_balance int;
begin
  update profiles set credits = credits - p_amount
   where id = p_user and credits >= p_amount and not is_suspended
   returning credits into new_balance;
  if new_balance is null then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;
  insert into credit_ledger(user_id, amount, reason, job_id) values (p_user, -p_amount, 'spend', p_job);
  update jobs set credits_charged = p_amount where id = p_job;
  return new_balance;
end $$;

-- Refund a failed job once.
create or replace function public.refund_job(p_job uuid) returns void
language plpgsql security definer set search_path = public as $$
declare j jobs;
begin
  select * into j from jobs where id = p_job for update;
  if j.id is null or j.refunded or j.credits_charged = 0 then return; end if;
  update profiles set credits = credits + j.credits_charged where id = j.user_id;
  insert into credit_ledger(user_id, amount, reason, job_id) values (j.user_id, j.credits_charged, 'refund', j.id);
  update jobs set refunded = true, updated_at = now() where id = j.id;
end $$;

-- Grant credits (admin / referral). Idempotent when p_ref given.
create or replace function public.grant_credits(p_user uuid, p_amount int, p_reason text, p_ref text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_ref is not null and exists(select 1 from credit_ledger where ref = p_ref and reason = p_reason) then
    return;
  end if;
  update profiles set credits = greatest(0, credits + p_amount) where id = p_user;
  insert into credit_ledger(user_id, amount, reason, ref) values (p_user, p_amount, p_reason, p_ref);
end $$;

-- Monthly renewal: monthly credits reset to the plan amount. Idempotent per invoice.
create or replace function public.renew_credits(p_user uuid, p_plan text, p_invoice text)
returns void language plpgsql security definer set search_path = public as $$
declare plan_credits int; old_balance int;
begin
  if exists(select 1 from credit_ledger where ref = p_invoice and reason = 'subscription') then return; end if;
  select credits into plan_credits from plans where id = p_plan;
  select credits into old_balance from profiles where id = p_user for update;
  if old_balance > 0 then
    insert into credit_ledger(user_id, amount, reason, ref) values (p_user, -old_balance, 'renewal_reset', p_invoice);
  end if;
  update profiles set credits = plan_credits, plan_id = p_plan where id = p_user;
  insert into credit_ledger(user_id, amount, reason, ref) values (p_user, plan_credits, 'subscription', p_invoice);
end $$;

-- Only the server (service role) may call money functions.
revoke execute on function public.spend_credits(uuid,int,uuid) from public, anon, authenticated;
revoke execute on function public.refund_job(uuid) from public, anon, authenticated;
revoke execute on function public.grant_credits(uuid,int,text,text) from public, anon, authenticated;
revoke execute on function public.renew_credits(uuid,text,text) from public, anon, authenticated;
grant execute on function public.spend_credits(uuid,int,uuid) to service_role;
grant execute on function public.refund_job(uuid) to service_role;
grant execute on function public.grant_credits(uuid,int,text,text) to service_role;
grant execute on function public.renew_credits(uuid,text,text) to service_role;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.tools enable row level security;
alter table public.jobs enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.brand_kits enable row level security;
alter table public.site_content enable row level security;
alter table public.gallery_items enable row level security;

-- Public read
create policy "plans readable" on public.plans for select using (true);
create policy "tools readable" on public.tools for select using (true);
create policy "content readable" on public.site_content for select using (true);
create policy "gallery readable" on public.gallery_items for select using (is_published or public.is_admin());

-- Own rows
create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "own profile update" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid());
create policy "own subs" on public.subscriptions for select using (user_id = auth.uid() or public.is_admin());
create policy "own jobs" on public.jobs for select using (user_id = auth.uid() or public.is_admin());
create policy "own jobs delete" on public.jobs for delete using (user_id = auth.uid());
create policy "own ledger" on public.credit_ledger for select using (user_id = auth.uid() or public.is_admin());
create policy "own brand" on public.brand_kits for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Admin writes on CMS tables
create policy "admin plans" on public.plans for all using (public.is_admin()) with check (public.is_admin());
create policy "admin tools" on public.tools for all using (public.is_admin()) with check (public.is_admin());
create policy "admin content" on public.site_content for all using (public.is_admin()) with check (public.is_admin());
create policy "admin gallery" on public.gallery_items for all using (public.is_admin()) with check (public.is_admin());

-- Users must not change their own role / credits / plan through the API
create or replace function public.protect_profile_columns() returns trigger
language plpgsql as $$
begin
  if auth.role() = 'authenticated' and not public.is_admin() then
    new.role := old.role; new.credits := old.credits; new.plan_id := old.plan_id;
    new.is_suspended := old.is_suspended; new.stripe_customer_id := old.stripe_customer_id;
    new.referred_by := old.referred_by; new.referral_code := old.referral_code;
  end if;
  return new;
end $$;
create trigger protect_profile before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ============================================================
-- Storage buckets
-- ============================================================
insert into storage.buckets (id, name, public) values ('uploads', 'uploads', false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('results', 'results', false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('site', 'site', true) on conflict do nothing;

create policy "users upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users read own uploads" on storage.objects for select to authenticated
  using (bucket_id in ('uploads','results') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "site public read" on storage.objects for select using (bucket_id = 'site');
create policy "admin site write" on storage.objects for all to authenticated
  using (bucket_id = 'site' and public.is_admin()) with check (bucket_id = 'site' and public.is_admin());
