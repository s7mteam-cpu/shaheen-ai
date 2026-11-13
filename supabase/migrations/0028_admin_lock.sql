-- v65: «كلمات السر»: كلمة سر ثانية للإدارة، تحطها على أي قسم (وتصفير المنصة مقفول دائماً).
-- محفوظة مشفّرة (scrypt)، والجدول للسيرفر بس: ما أحد يقرأه من المتصفح.
create table if not exists public.admin_secrets (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.admin_secrets enable row level security;
revoke all on public.admin_secrets from anon, authenticated;

-- نسيت كلمة السر؟ شغّل هالسطر بـ Supabase، وبعدها تحط كلمة سر جديدة من الصفحة:
-- delete from public.admin_secrets where key = 'admin_lock';

select 'v65 ok' as result;
