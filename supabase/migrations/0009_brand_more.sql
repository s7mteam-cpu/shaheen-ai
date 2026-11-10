-- Brand identity used by the montage/motion tools: contact handle and preferred Arabic font
alter table public.brand_kits add column if not exists handle text;
alter table public.brand_kits add column if not exists font text;
