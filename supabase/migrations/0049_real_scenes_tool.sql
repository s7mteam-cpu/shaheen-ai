-- «مشاهد واقعية»: فيديو بلقطات حقيقية بدون ظهور متحدث (أداة جديدة بقائمة الأدوات)
insert into public.tools (id, provider, name, description, category, icon, credit_cost, edit_cost, cost_unit, provider_model, is_enabled, sort_order)
values ('real-scenes', 'claude', 'مشاهد واقعية',
  'فيديو بلقطات حقيقية بدون ظهور متحدث: اكتب نص الإعلان أو الكلام، وشاهين يقرأه بصوت ولهجة تختارها ويركّب فوقه لقطات واقعية تناسب كل جملة، بالمقاس اللي تبيه (ريلز، يوتيوب، مربع، 4:5).',
  'video', 'film', 10, 5, '15 ثانية', null, true, 3)
on conflict (id) do nothing;
