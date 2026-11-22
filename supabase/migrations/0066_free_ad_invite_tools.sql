-- v250: خمس أدوات مبتكرة على محرك «بوست مبتكر» (Claude يكتب التصميم من الصفر):
-- «إعلان مبتكر ✨» «دعوة مبتكرة ✨» «بطاقة عمل مبتكرة ✨» «عرض مبتكر ✨» «سيرة مبتكرة ✨».
-- السعر ينسخ من أداة قريبة (cost_from) والتصنيف من أداة القوالب المقابلة (cat_from). كله يتعدّل من «الأدوات والأسعار».
insert into public.tools (id, provider, name, description, category, icon, credit_cost, edit_cost, cost_unit, provider_model, is_enabled, sort_order)
select v.id, p.provider, v.name, v.description, coalesce(c.category, p.category), p.icon, coalesce(k.credit_cost, p.credit_cost), coalesce(k.edit_cost, p.edit_cost), coalesce(k.cost_unit, p.cost_unit), null, true, p.sort_order + v.ord
from (values
    ('free-ad', 'إعلان مبتكر ✨', 'اكتب عرضك، وشاهين يصمم لك إعلان جديد من الصفر (مو قالب جاهز): عنوان بيعي قوي، العرض بارز، ودعوة واضحة للشراء. وتعدّل كل شي بعدين. تجريبي.', 'free-post', 'ad-design', 2),
    ('free-invite', 'دعوة مبتكرة ✨', 'اكتب الأسماء والتاريخ والمكان والطابع اللي تحبه، وشاهين يصمم لك بطاقة دعوة جديدة من الصفر بزخارف أنيقة. وتعدّل كل شي بعدين. تجريبي.', 'free-post', 'invitations', 3),
    ('free-card', 'بطاقة عمل مبتكرة ✨', 'اكتب اسمك ومسمّاك وبيانات تواصلك، وشاهين يصمم لك بطاقة عمل جديدة من الصفر بوجهين (أمامي وخلفي) بمقاس الطباعة. وتعدّل كل شي بعدين. تجريبي.', 'free-post', 'business-cards', 4),
    ('free-deck', 'عرض مبتكر ✨', 'اكتب موضوع العرض ونقاطه، وشاهين يصمم لك شرائح عرض تقديمي جديدة من الصفر (4 إلى 8 شرائح)، صور وملف PDF جاهز للعرض. وتعدّل كل شي بعدين. تجريبي.', 'free-carousel', 'presentations', 5),
    ('free-cv', 'سيرة مبتكرة ✨', 'اكتب بياناتك وخبراتك، وشاهين يصمم لك سيرة ذاتية جديدة من الصفر بصفحة A4، صورة وملف PDF بنص حقيقي. وتعدّل كل شي بعدين. تجريبي.', 'cv', 'cv', 6)
  ) as v(id, name, description, cost_from, cat_from, ord)
join public.tools p on p.id = 'free-post'
left join public.tools k on k.id = v.cost_from
left join public.tools c on c.id = v.cat_from
on conflict (id) do update set name = excluded.name, description = excluded.description;
