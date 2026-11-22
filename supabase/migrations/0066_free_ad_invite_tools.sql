-- v250: «إعلان مبتكر ✨» و«دعوة مبتكرة ✨» و«بطاقة عمل مبتكرة ✨» — نفس محرك «بوست مبتكر» (Claude يكتب التصميم من الصفر) بطابع إعلان أو بطاقة دعوة.
-- السعر والتعديل ينسخون من «بوست مبتكر»، ويتعدّلون من «الأدوات والأسعار».
insert into public.tools (id, provider, name, description, category, icon, credit_cost, edit_cost, cost_unit, provider_model, is_enabled, sort_order)
select v.id, t.provider, v.name, v.description, t.category, t.icon, t.credit_cost, t.edit_cost, t.cost_unit, null, true, t.sort_order + v.ord
from public.tools t,
  (values
    ('free-ad', 'إعلان مبتكر ✨', 'اكتب عرضك، وشاهين يصمم لك إعلان جديد من الصفر (مو قالب جاهز): عنوان بيعي قوي، العرض بارز، ودعوة واضحة للشراء. وتعدّل كل شي بعدين. تجريبي.', 2),
    ('free-invite', 'دعوة مبتكرة ✨', 'اكتب الأسماء والتاريخ والمكان والطابع اللي تحبه، وشاهين يصمم لك بطاقة دعوة جديدة من الصفر بزخارف أنيقة. وتعدّل كل شي بعدين. تجريبي.', 3),
    ('free-card', 'بطاقة عمل مبتكرة ✨', 'اكتب اسمك ومسمّاك وبيانات تواصلك، وشاهين يصمم لك بطاقة عمل جديدة من الصفر بوجهين (أمامي وخلفي) بمقاس الطباعة. وتعدّل كل شي بعدين. تجريبي.', 4)
  ) as v(id, name, description, ord)
where t.id = 'free-post'
on conflict (id) do update set name = excluded.name, description = excluded.description;
