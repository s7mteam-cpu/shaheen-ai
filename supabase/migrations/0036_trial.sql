-- v81: التجربة المجانية — ريش مجانية لمرة وحدة (تتحكم بالعدد والمدة من لوحة الإدارة ← الباقات).

-- سجل الريش: نوعين جدد («تجربة مجانية» و«انتهاء التجربة»)
alter table public.credit_ledger drop constraint if exists credit_ledger_reason_check;
alter table public.credit_ledger add constraint credit_ledger_reason_check
  check (reason in ('subscription','renewal_reset','spend','refund','admin','referral','trial','trial_end'));

-- كل تجربة انعطت. تظل حتى لو انحذف الحساب (علشان نفس الرقم أو الجهاز ما ياخذ تجربة ثانية).
create table if not exists public.trial_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text,
  phone text,
  device text,
  ip text,
  credits int not null,
  expires_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists trial_claims_user_uq on public.trial_claims (user_id) where user_id is not null;
create unique index if not exists trial_claims_phone_uq on public.trial_claims (phone) where phone is not null;
create index if not exists trial_claims_device_idx on public.trial_claims (device);
create index if not exists trial_claims_ip_idx on public.trial_claims (ip, created_at desc);
create index if not exists trial_claims_open_idx on public.trial_claims (expires_at) where ended_at is null;
alter table public.trial_claims enable row level security;
revoke all on public.trial_claims from anon, authenticated;

-- إنهاء تجربة انتهى وقتها: تنشال ريش التجربة الباقية (إلا إذا اشترك، لأن الاشتراك يبدّل الريش أصلاً)
create or replace function public.end_expired_trial(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c record; bal int; left_credits int;
begin
  for c in select * from trial_claims where user_id = p_user and ended_at is null and expires_at <= now() for update loop
    update trial_claims set ended_at = now() where id = c.id;
    if not exists (select 1 from subscriptions where user_id = p_user and status in ('active','past_due')) then
      select credits into bal from profiles where id = p_user for update;
      left_credits := least(coalesce(bal, 0), c.credits);
      if left_credits > 0 then
        update profiles set credits = credits - left_credits where id = p_user;
        insert into credit_ledger(user_id, amount, reason, ref) values (p_user, -left_credits, 'trial_end', 'trial_end:' || c.id);
      end if;
      insert into notifications(user_id, kind, title, body, link)
      values (p_user, 'payment', 'انتهت تجربتك المجانية', 'عجبتك شاهين؟ اشترك الحين وكمّل بكل الأدوات.', '/#pricing');
    end if;
  end loop;
end $$;
revoke execute on function public.end_expired_trial(uuid) from public, anon, authenticated;
grant execute on function public.end_expired_trial(uuid) to service_role;

-- كل صرف ريش (أي أداة) يتأكد أول إن التجربة ما انتهت. نفس الدالة الأصلية بالضبط + سطر واحد بالبداية.
create or replace function public.spend_credits(p_user uuid, p_amount int, p_job uuid)
returns int language plpgsql security definer set search_path = public as $$
declare new_balance int;
begin
  perform public.end_expired_trial(p_user);
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
revoke execute on function public.spend_credits(uuid,int,uuid) from public, anon, authenticated;
grant execute on function public.spend_credits(uuid,int,uuid) to service_role;

-- الإعدادات الافتراضية (تعدّلها من لوحة الإدارة)
insert into public.site_content (key, value)
values ('trial', '{"enabled": true, "credits": 30, "hours": 24, "per_ip_day": 2, "max_per_day": 30}'::jsonb)
on conflict (key) do nothing;

-- Google Sheets
do $$
begin
  if exists (select 1 from pg_proc where proname = 'sheets_mark_dirty') then
    drop trigger if exists sheets_dirty on public.trial_claims;
    create trigger sheets_dirty after insert or update or delete on public.trial_claims for each statement execute function public.sheets_mark_dirty();
  end if;
end $$;

select 'v81 ok' as result, (select value from public.site_content where key = 'trial') as trial_settings;
