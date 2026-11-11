-- v32 (Nov 2026): English version of the site. Texts the admin writes in Arabic are translated once by AI and kept here.
create table if not exists public.translations (
  src_hash text not null,           -- md5 of the Arabic text
  lang text not null default 'en',
  src text not null,                -- the Arabic text (for reference / editing)
  text text not null,               -- the translation
  edited boolean not null default false,   -- true = written by the admin, never overwritten by AI
  updated_at timestamptz not null default now(),
  primary key (src_hash, lang)
);
alter table public.translations enable row level security;
drop policy if exists "read translations" on public.translations;
create policy "read translations" on public.translations for select using (true);

select 'v32 ok' as result, (select count(*) from information_schema.tables where table_name = 'translations') as translations_ready;
