-- v83: «معرض شاهين» — نماذج من شغل شاهين (بوستات، كاروسيل، ريلز، فيديو، بطاقات…) يشوفها العميل داخل المنصة.
-- نفس جدول «معرض الأعمال» مع خانات زيادة. الأعمال القديمة تظل وتطلع بالمكانين.
alter table public.gallery_items add column if not exists category text not null default 'design';
alter table public.gallery_items add column if not exists description text not null default '';
alter table public.gallery_items add column if not exists extra_media jsonb not null default '[]'::jsonb;  -- باقي صور الكاروسيل
alter table public.gallery_items add column if not exists in_app boolean not null default true;            -- يطلع بـ «معرض شاهين» داخل المنصة
alter table public.gallery_items add column if not exists on_home boolean not null default true;           -- يطلع بصفحة الموقع الرئيسية
create index if not exists gallery_items_app_idx on public.gallery_items (in_app, sort_order) where is_published;

select 'v83 ok' as result, (select count(*) from public.gallery_items) as items;
