-- v89: «سوّ مثله» — وصف أسلوب العمل (اختياري) يستفيد منه شاهين لما العميل يطلب نفس الستايل.
alter table public.gallery_items add column if not exists recipe text not null default '';
alter table public.gallery_items add column if not exists like_on boolean not null default true;  -- زر «سوّ مثله» يطلع تحت هالعمل

select 'v89 ok' as result;
