-- v244: «فيديو مبتكر من موقعك ✨» — أداة مستقلة: شاهين يقرأ الموقع ثم يرسم فيديو جديداً من الصفر (محرك الفيديو المبتكر) ولقطات الموقع داخله.
-- credit_cost = ريش لكل 15 ثانية، edit_cost = التعديل. السعر يتعدّل من «الأدوات والأسعار».
insert into public.tools (id, provider, name, description, category, icon, credit_cost, edit_cost, cost_unit, provider_model, is_enabled, sort_order)
select 'site-free', 'claude', 'فيديو مبتكر من موقعك ✨',
  'حط رابط موقعك، وشاهين يقرأه ويرسم لك فيديو إعلاني جديد من الصفر (مو قالب جاهز): عناوين ورسومات متحركة من وصفك، ولقطات موقعك الحقيقية داخل جوال ولابتوب، مع تعليق صوتي بلهجتك. تجريبي.',
  t.category, 'sparkles', t.credit_cost, t.edit_cost, t.cost_unit, null, true, t.sort_order + 1
from public.tools t where t.id = 'free-motion'
on conflict (id) do update set name = excluded.name, description = excluded.description;
