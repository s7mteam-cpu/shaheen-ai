-- v90: مكتبة قوالب الموشن جرافيك: لكل ستايل مجموعة قوالب. العميل يختار قالب ويكتب معلوماته.
create table if not exists public.video_templates (
  id uuid primary key default gen_random_uuid(),
  tool_id text not null default 'motion-video',
  style text not null,                       -- ستايل الرسومات (gulf-cartoon, neon, doodle…)
  title text not null,
  scenario text not null default '',         -- الفكرة التجريبية اللي انبنى عليها القالب
  seconds int not null default 30,
  aspect text not null default '9:16',
  skeleton jsonb not null default '{}'::jsonb, -- {scenes:[{kind,dur}], colors, font, board, illus}
  thumb_url text,
  is_published boolean not null default true,
  sort_order int not null default 0,
  source text not null default 'auto',       -- auto | saved (حفظته من فيديو سويته)
  created_at timestamptz not null default now()
);
create index if not exists video_templates_style_idx on public.video_templates (tool_id, style, sort_order) where is_published;
alter table public.video_templates enable row level security;
drop policy if exists "templates readable" on public.video_templates;
create policy "templates readable" on public.video_templates for select using (is_published or public.is_admin());
drop policy if exists "admin templates" on public.video_templates;
create policy "admin templates" on public.video_templates for all using (public.is_admin()) with check (public.is_admin());

select 'v90 ok' as result;
