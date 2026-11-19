-- «تصميم مبتكر»: أداة جديدة (الذكاء الاصطناعي يكتب كود موشن جرافيك خاص بفكرة العميل ويرسمه فيديو).
-- credit_cost = ريش لكل 15 ثانية، edit_cost = «سوّ مثله» (نفس التصميم بنصوص جديدة). السعر قابل للتعديل من لوحة الأدمن.
insert into public.tools (id, provider, name, description, category, icon, credit_cost, edit_cost, cost_unit, provider_model, is_enabled, sort_order)
values ('free-motion', 'claude', 'تصميم مبتكر ✨',
  'اكتب فكرتك، وشاهين يصمّم لك موشن جرافيك خاص من الصفر بالكود (حركات وانتقالات وأيقونات منصات حقيقية بألوان هويتك) بدل القوالب الجاهزة. تعدّل النصوص والألوان بعد التصميم، وتقدر تسوّي نفس التصميم بكلام جديد. تجريبي.',
  'video', 'film', 25, 8, '15 ثانية', null, true, 5)
on conflict (id) do nothing;
