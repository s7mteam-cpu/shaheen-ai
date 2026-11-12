-- v54 (Nov 2026): «فيديو قرآني» — Quran verses (Uthmani text) + a reciter's voice + a calm moving background.
insert into public.tools (id, provider, name, description, category, icon, credit_cost, edit_cost, cost_unit, provider_model, is_enabled, sort_order)
values ('quran-video', 'claude', 'فيديو قرآني', 'اختر السورة والآيات والقارئ (مثل ياسر الدوسري)، وشاهين يسوي فيديو بخلفية متحركة هادئة ونص الآيات بالرسم العثماني مع التلاوة، بدون موسيقى.', 'video', 'film', 3, 0, '30 ثانية', null, true, 6)
on conflict (id) do nothing;

select 'v54 ok' as result, (select count(*) from public.tools where id = 'quran-video') as quran_tool;
