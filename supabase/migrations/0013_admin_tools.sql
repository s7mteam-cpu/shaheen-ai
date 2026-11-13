-- Admin tools (Nov 2026): blocked emails + audit log of admin actions on customers.

-- 1) Emails that may not sign up again (email or Google). Only the server (service role) reads/writes it.
create table if not exists public.blocked_emails (
  email text primary key,
  reason text,
  blocked_by uuid,
  created_at timestamptz not null default now()
);
alter table public.blocked_emails enable row level security;

create or replace function public.block_banned_signup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is not null and exists (select 1 from public.blocked_emails where email = lower(new.email)) then
    raise exception 'EMAIL_BLOCKED';
  end if;
  return new;
end $$;

drop trigger if exists block_banned_signup on auth.users;
create trigger block_banned_signup before insert on auth.users
  for each row execute function public.block_banned_signup();

-- 2) Every sensitive admin action on a customer is recorded here.
create table if not exists public.admin_audit (
  id bigserial primary key,
  admin_id uuid,
  admin_email text,
  action text not null,
  target_user uuid,
  target_email text,
  note text,
  created_at timestamptz not null default now()
);
alter table public.admin_audit enable row level security;
create index if not exists admin_audit_target on public.admin_audit(target_user, created_at desc);

-- 3) Support access: the admin asks, the customer approves in writing, access ends by itself.
create table if not exists public.support_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','approved','denied','revoked','expired')),
  signed_name text,
  consent_text text,
  decided_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.support_access enable row level security;
create index if not exists support_access_user on public.support_access(user_id, created_at desc);

select 'ok' as result,
  (select count(*) from pg_trigger where tgname = 'block_banned_signup') as trigger_installed;

-- 4) Notifications (the bell next to the account circle).
create table if not exists public.notifications (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'info',
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
drop policy if exists "own notifications" on public.notifications;
create policy "own notifications" on public.notifications for select using (user_id = auth.uid());
create index if not exists notifications_user on public.notifications(user_id, created_at desc);

-- A finished or failed job tells its owner.
create or replace function public.notify_job() returns trigger
language plpgsql security definer set search_path = public as $$
declare tname text;
begin
  if new.status is distinct from old.status and new.status in ('done', 'failed') then
    select name into tname from tools where id = new.tool_id;
    insert into notifications(user_id, kind, title, body, link) values (
      new.user_id,
      case when new.status = 'done' then 'done' else 'failed' end,
      case when new.status = 'done' then 'جاهز: ' || coalesce(tname, 'عملك') else 'ما نجح: ' || coalesce(tname, 'عملك') end,
      case when new.status = 'done' then coalesce(new.title, 'عملك جاهز، افتحه من «أعمالي».') else 'رجعت ريشه لرصيدك تلقائياً. جرّب مرة ثانية.' end,
      '/app/tools/' || new.tool_id || '?job=' || new.id
    );
  end if;
  return new;
end $$;
drop trigger if exists notify_job on public.jobs;
create trigger notify_job after update of status on public.jobs for each row execute function public.notify_job();

-- Plan renewals, admin top-ups/deductions and referral rewards.
create or replace function public.notify_credits() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.reason = 'subscription' then
    insert into notifications(user_id, kind, title, body, link) values (new.user_id, 'credits', 'تجدّد اشتراكك', 'انضاف ' || new.amount || ' ريشة لرصيدك.', '/app/account?tab=spend');
  elsif new.reason = 'admin' and new.amount > 0 then
    insert into notifications(user_id, kind, title, body, link) values (new.user_id, 'credits', 'وصلتك ريش من فريق شاهين', 'انضاف ' || new.amount || ' ريشة لرصيدك.', '/app/account?tab=spend');
  elsif new.reason = 'admin' and new.amount < 0 then
    insert into notifications(user_id, kind, title, body, link) values (new.user_id, 'credits', 'تعديل على رصيدك', 'انخصم ' || abs(new.amount) || ' ريشة من فريق شاهين.', '/app/account?tab=spend');
  elsif new.reason = 'referral' then
    insert into notifications(user_id, kind, title, body, link) values (new.user_id, 'credits', 'مكافأة دعوة صديق', 'انضاف ' || new.amount || ' ريشة لرصيدك.', '/app/account?tab=spend');
  end if;
  return new;
end $$;
drop trigger if exists notify_credits on public.credit_ledger;
create trigger notify_credits after insert on public.credit_ledger for each row execute function public.notify_credits();

-- A support-access request reaches the customer.
create or replace function public.notify_access() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications(user_id, kind, title, body, link) values (new.user_id, 'access', 'طلب صلاحية من فريق شاهين', 'السبب: ' || new.reason || '. راجع الطلب ووافق أو ارفض.', '/app/account?tab=access');
  return new;
end $$;
drop trigger if exists notify_access on public.support_access;
create trigger notify_access after insert on public.support_access for each row execute function public.notify_access();

select 'notifications ok' as result,
  (select count(*) from pg_trigger where tgname in ('notify_job', 'notify_credits', 'notify_access')) as notify_triggers;
