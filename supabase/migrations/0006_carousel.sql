-- Instagram carousel tool + new order
insert into public.tools (id, provider, name, description, category, icon, credit_cost, edit_cost, cost_unit, provider_model, is_enabled, sort_order)
values ('carousel','fal','كاروسيل إنستغرام','سلسلة شرائح متناسقة بعناوين عربية، تشرح فكرة أو منتج خطوة بخطوة.','image','layers',2,2,'شريحة','fal-ai/nano-banana-pro',true,2)
on conflict (id) do nothing;
update public.tools t set sort_order = v.ord
from (values ('image',1),('carousel',2),('motion-video',3),('video-editing',4),('avatar-video',5),('ad-design',6),('voice',7),('nasheed',8),('product-photo',9)) as v(id,ord)
where t.id = v.id;
