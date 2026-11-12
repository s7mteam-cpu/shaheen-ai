-- v64: «الحسابات المغلقة» — أرشيف الحسابات المحذوفة والمحظورة لمدة 5 سنوات، وبعدها تنحذف تلقائياً (المهمة اليومية).
-- للإدارة فقط (RLS بدون سياسات = ما أحد يقرأه إلا من السيرفر).
create table if not exists public.closed_accounts (
  id uuid primary key default gen_random_uuid(),
  old_user_id uuid,
  full_name text,
  email text,
  phone text,
  plan_id text,
  credits_left integer,
  signed_up_at timestamptz,
  closed_at timestamptz not null default now(),
  reason text not null check (reason in ('self','admin','banned')),
  closed_by text,          -- بريد الإداري اللي حذفه (فاضي لو العميل حذفه بنفسه)
  note text,               -- سبب الحذف أو الحظر
  history jsonb not null default '[]',
  purge_at timestamptz not null default (now() + interval '5 years')
);
create index if not exists closed_accounts_email_idx on public.closed_accounts (lower(email));
create index if not exists closed_accounts_phone_idx on public.closed_accounts (phone);
create index if not exists closed_accounts_purge_idx on public.closed_accounts (purge_at);
alter table public.closed_accounts enable row level security;
revoke all on public.closed_accounts from anon, authenticated;

-- إذا كنت معدّل سياسة الخصوصية أو سياسة الاسترجاع من لوحة الإدارة، النص الجديد عن الأرشيف لازم تضيفه بنفسك هناك
select 'v64 ok' as result,
  case when exists (select 1 from public.site_content where key = 'legal' and (value ? 'privacy' or value ? 'refund'))
       then 'تنبيه: عندك نص خصوصية أو استرجاع معدّل من الإدارة — شوف رسالة كلود'
       else 'السياسات بتتحدث تلقائياً' end as legal;
