-- v36 (Nov 2026): every tool can have a demo video (YouTube link or a short uploaded clip) and a 9:16 thumbnail.
alter table public.tools add column if not exists demo_url text;
alter table public.tools add column if not exists demo_thumb text;

select 'v36 ok' as result, (select count(*) from information_schema.columns where table_name = 'tools' and column_name = 'demo_url') as demos_ready;
