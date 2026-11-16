-- v88b: ترتيب خاص بالصفحة الرئيسية لكل عمل (مستقل عن ترتيبه داخل المنصة). فاضي = نفس الترتيب العادي.
alter table public.gallery_items add column if not exists home_order int;
select 'v88b ok' as result;
