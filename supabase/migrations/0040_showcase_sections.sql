-- v88: أقسام «أعمال صُنعت بشاهين» (قسم لكل أداة): ترتيبها، وصفها، طريقة العمل، المميزات.
create table if not exists public.showcase_sections (
  cat text primary key,
  sort_order int not null default 0,
  hidden boolean not null default false,
  intro text not null default '',
  steps text not null default '',      -- كل سطر = خطوة
  features text not null default '',   -- كل سطر = ميزة
  updated_at timestamptz not null default now()
);
alter table public.showcase_sections enable row level security;
drop policy if exists "sections readable" on public.showcase_sections;
create policy "sections readable" on public.showcase_sections for select using (true);
drop policy if exists "admin sections" on public.showcase_sections;
create policy "admin sections" on public.showcase_sections for all using (public.is_admin()) with check (public.is_admin());

select 'v88 ok' as result;
