-- v257: «إنشاء أنيميشن مبتكر ✨» — أداة مستقلة: العميل يكتب فكرته ويختار ستايل رسم، والقصة تنرسم وتتحرك بالكود (محرك الفيديو المبتكر).
-- السعر ينسخ من «تصميم مبتكر» ويتعدّل من «الأدوات والأسعار». الطلبات تنحفظ بمحرك free-motion وتفتح بنفس الاستوديو.
insert into public.tools (id, provider, name, description, category, icon, credit_cost, edit_cost, cost_unit, provider_model, is_enabled, sort_order)
select 'anim-video', t.provider, 'إنشاء أنيميشن مبتكر ✨',
  'اكتب قصتك أو فكرتك واختر ستايل الرسم (نيون، قص ورق، سبورة، بكسل، زخارف…)، وشاهين يرسمها مشاهد وشخصيات متحركة مع تعليق صوتي بلهجتك. للتوعية والتعليم والقصص والإعلانات. وتعدّل النصوص والشعار بعدين. تجريبي.',
  t.category, t.icon, t.credit_cost, t.edit_cost, t.cost_unit, null, true, t.sort_order + 1
from public.tools t where t.id = 'free-motion'
on conflict (id) do update set name = excluded.name, description = excluded.description;
