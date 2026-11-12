-- v53 (Nov 2026): tool cards in «الأدوات» — an illustration picture + a «علّمني الطريقة» video per tool.
alter table public.tools add column if not exists tutorial_url text;
alter table public.tools add column if not exists cover_url text;

select 'v53 ok' as result, (select count(*) from information_schema.columns where table_name = 'tools' and column_name in ('tutorial_url', 'cover_url')) as columns_ready;
