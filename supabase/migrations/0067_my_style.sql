-- v255: «أسلوبي» في «هويتي التجارية»: وصف ذوق العميل بالكلام، وفيديو مرجعي واحد (الصور المرجعية موجودة من قبل في style_refs).
alter table public.brand_kits add column if not exists style_note text;
alter table public.brand_kits add column if not exists style_video text;
