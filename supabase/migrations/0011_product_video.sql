-- Product video: a product photo animated into a short ad clip (Claude writes the shot, Gemini Omni renders it)
insert into public.tools (id, provider, name, description, category, icon, credit_cost, edit_cost, cost_unit, provider_model, is_enabled, sort_order)
values ('product-video','google','فيديو المنتج','ارفع صورة منتجك، ونحوّلها لفيديو إعلاني واقعي: إضاءة سينمائية، حركة كاميرا، وموسيقى.','video','film',5,5,'5 ثواني','gemini-omni-1.2-flash',true,5)
on conflict (id) do nothing;

update public.tools t set sort_order = v.ord
from (values ('post',1),('carousel',2),('ad-design',3),('motion-video',4),('product-video',5),('video-editing',6),('image',7),('product-photo',8),('avatar-video',9),('voice',10),('nasheed',11)) as v(id,ord)
where t.id = v.id;
