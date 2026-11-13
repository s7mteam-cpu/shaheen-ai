-- v85: «تخطي التجربة المجانية» ينحفظ بالإيميل والرقم والجهاز، ويظل حتى لو انحذف الحساب
-- (علشان اللي يتخطى ويحذف حسابه ويسجل من جديد ما ترجع له الهدية).
create table if not exists public.trial_declines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text,
  phone text,
  device text,
  created_at timestamptz not null default now()
);
create index if not exists trial_declines_email_idx on public.trial_declines (email);
create index if not exists trial_declines_phone_idx on public.trial_declines (phone);
create index if not exists trial_declines_device_idx on public.trial_declines (device);
alter table public.trial_declines enable row level security;
revoke all on public.trial_declines from anon, authenticated;

-- من سبق وتخطّى (قبل هالتحديث) ينحفظ بعد
insert into public.trial_declines (user_id, email, phone)
select p.id, lower(p.email), p.phone from public.profiles p
where p.trial_declined_at is not null
  and not exists (select 1 from public.trial_declines d where d.user_id = p.id);

select 'v85 ok' as result, (select count(*) from public.trial_declines) as declines;
