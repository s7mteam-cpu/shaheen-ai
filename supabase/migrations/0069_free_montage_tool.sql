-- v259: «مونتاج مبتكر: غرافيكس ومؤثرات فوق الفيديو» — أداة مستقلة: العميل يرفع فيديوه وهو يتكلم، والغرافيكس تنرسم بالكود من كلامه وتتركّب فوق الفيديو.
-- السعر بالدقيقة: ينسخ سعر «إنشاء أنيميشن مبتكر» (لكل 15 ثانية) × 4، ويتعدّل من «الأدوات والأسعار».
insert into public.tools (id, provider, name, description, category, icon, credit_cost, edit_cost, cost_unit, provider_model, is_enabled, sort_order)
select 'free-montage', t.provider, 'مونتاج مبتكر: غرافيكس ومؤثرات فوق الفيديو',
  'ارفع فيديوك وأنت تتكلم، واختر الستايل (قصاصات ورق، قصاصات جرائد، وثائقي، ريلز جريء…) أو اكتبه بوصفك. شاهين يسمع كلامك ويرسم عناوين وأرقام وخرائط وملصقات متحركة بتوقيت كلامك ويركّبها فوق الفيديو مع ترجمة كلمة كلمة. فيديوك وصوتك ما يتغيرون. تجريبي.',
  t.category, t.icon, t.credit_cost * 4, t.edit_cost, t.cost_unit, null, true, t.sort_order + 1
from public.tools t where t.id = 'anim-video'
on conflict (id) do update set name = excluded.name, description = excluded.description;
