-- v63: «السجل الكامل» لكل عميل — أحداث الحساب (دخول، دخول فاشل، تغيير كلمة المرور، محتوى مخالف، تصفير الهوية).
-- الجدول للإدارة فقط (RLS بدون سياسات = ما أحد يقرأه إلا من السيرفر). ينحذف مع حذف حساب العميل.
create table if not exists public.user_events (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('login','login_failed','password','violation','brand_reset')),
  detail text,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists user_events_user_idx on public.user_events (user_id, created_at desc);
alter table public.user_events enable row level security;
revoke all on public.user_events from anon, authenticated;

select 'v63 ok' as result;
