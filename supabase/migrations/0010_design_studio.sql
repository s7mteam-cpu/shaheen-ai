-- Design studio: posts, carousels and ads designed by Claude as editable layers (rendered to PNG by the worker)
insert into public.tools (id, provider, name, description, category, icon, credit_cost, edit_cost, cost_unit, provider_model, is_enabled, sort_order)
values ('post','fal','إنشاء بوست','تصميم بوست احترافي من معلوماتك: نصوص عربية مظبوطة، أيقونات، صورك أو صور بالذكاء الاصطناعي، وتعدّل كل شي مباشرة.','image','palette',3,2,'تصميم','fal-ai/nano-banana-pro',true,1)
on conflict (id) do nothing;

update public.tools set name = 'إنشاء صورة بالذكاء الاصطناعي', icon = 'sparkles' where id = 'image';
update public.tools set description = 'سلسلة شرائح متناسقة: غلاف، نقاط، وخاتمة، تعدّل نصوصها وألوانها وترتيبها مباشرة.', edit_cost = 2 where id = 'carousel';
update public.tools set description = 'تصاميم إعلانية بزوايا تسويقية مختلفة، مع كابشن لكل إعلان، وتعدّلها مباشرة.', edit_cost = 2 where id = 'ad-design';

update public.tools t set sort_order = v.ord
from (values ('post',1),('carousel',2),('ad-design',3),('motion-video',4),('video-editing',5),('image',6),('product-photo',7),('avatar-video',8),('voice',9),('nasheed',10)) as v(id,ord)
where t.id = v.id;

-- Brand inspiration: website, Instagram, and a few favourite posts as style references
alter table public.brand_kits add column if not exists website text;
alter table public.brand_kits add column if not exists instagram text;
alter table public.brand_kits add column if not exists style_refs text[] not null default '{}';

-- The customer's field (restaurant, coach, contracting...) remembered for the next design
alter table public.brand_kits add column if not exists industry text;
