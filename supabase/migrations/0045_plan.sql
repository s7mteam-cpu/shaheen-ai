-- Monthly content plan + business analysis (made after the identity is chosen).
alter table public.brand_kits add column if not exists content_plan jsonb;
alter table public.brand_kits add column if not exists analysis jsonb;

-- hidden pricing row for «خطة المحتوى الشهرية» (is_enabled=false keeps it out of the tools grid; change credit_cost from the admin tools page)
insert into public.tools (id, provider, name, description, category, icon, credit_cost, edit_cost, cost_unit, provider_model, is_enabled, sort_order)
values ('brand-plan','claude','خطة المحتوى الشهرية','تسعيرة «خطة المحتوى الشهرية» (مخفية من قائمة الأدوات).','image','palette',4,0,'طلب',null,false,99)
on conflict (id) do nothing;
