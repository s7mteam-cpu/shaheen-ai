-- «إنشاء هوية»: AI brand-identity concepts. The chosen identity is kept on the brand kit.
alter table public.brand_kits add column if not exists about text;
alter table public.brand_kits add column if not exists cv_text text;
alter table public.brand_kits add column if not exists identity jsonb;
alter table public.brand_kits add column if not exists identity_options jsonb;

-- hidden pricing row (is_enabled=false keeps it out of the tools grid). credit_cost = identity concepts, edit_cost = extra for drawing 4 logo marks. Adjust in the admin tools page.
insert into public.tools (id, provider, name, description, category, icon, credit_cost, edit_cost, cost_unit, provider_model, is_enabled, sort_order)
values ('brand-identity','claude','إنشاء هوية','تسعيرة «إنشاء هوية» (مخفية من قائمة الأدوات).','image','palette',6,6,'طلب',null,false,99)
on conflict (id) do nothing;
