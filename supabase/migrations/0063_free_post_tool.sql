-- v234/v235: «بوست مبتكر» و«كاروسيل مبتكر» — the AI writes the design itself (not a fixed template) and Shaheen draws it as PNG.
-- credit_cost = ريش لكل شريحة، edit_cost = تعديل بالكلام. السعر يتعدّل من «الأدوات والأسعار».
insert into public.tools (id, provider, name, description, category, icon, credit_cost, edit_cost, cost_unit, provider_model, is_enabled, sort_order)
values ('free-post', 'claude', 'بوست مبتكر ✨',
  'اكتب فكرتك، وشاهين يصمّم لك بوست من الصفر (مو قالب جاهز): عنوان قوي، رسومات وأشكال خاصة بفكرتك، وألوان هويتك. وبعدها تعدّل عليه بالكلام. تجريبي.',
  'image', 'sparkles', 6, 3, 'بوست', null, true, 3),
 ('free-carousel', 'claude', 'كاروسيل مبتكر ✨',
  'اكتب فكرتك، وشاهين يصمّم لك كاروسيل كامل من الصفر (من 3 إلى 8 شرائح): غلاف يشدّ، شرائح مرتبة، ودعوة بالنهاية، بنفس الهوية. وبعدها تعدّل عليه بالكلام. تجريبي.',
  'image', 'sparkles', 6, 3, 'شريحة', null, true, 4)
on conflict (id) do update set name = excluded.name, description = excluded.description, cost_unit = excluded.cost_unit;
