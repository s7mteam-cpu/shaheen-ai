-- «مكتبة الأساليب»: تصاميم موشن (كود) معتمدة تُحوَّل لصيغة شاهين، وتصير نقطة بداية للتصميم المبتكر.
-- للإدارة فقط (RLS مفعّل بدون سياسات: الخادم بمفتاح الخدمة وحده يقرأ ويكتب).
create table if not exists public.free_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  tags text[] not null default '{}',
  aspect text not null default '9:16',
  status text not null default 'converting' check (status in ('converting','review','approved','failed')),
  source_code text not null,
  code text,
  fields jsonb not null default '[]'::jsonb,
  assets jsonb not null default '{}'::jsonb,
  thumb_path text,
  error text,
  created_by uuid references auth.users(id) on delete set null
);
alter table public.free_templates enable row level security;
create index if not exists free_templates_status_idx on public.free_templates (status, created_at desc);
