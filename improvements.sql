-- 1) ترتيب الباقات: أفراد (البداية، الشاهين، الصقر الذهبي) ثم شركات (شاهين، شاهين بلس، شاهين برو)
update public.plans set sort_order = case name
  when 'البداية' then 1
  when 'الشاهين' then 2
  when 'الصقر الذهبي' then 3
  when 'شاهين' then 4
  when 'شاهين بلس' then 5
  when 'شاهين برو' then 6
  else sort_order end
where name in ('البداية','الشاهين','الصقر الذهبي','شاهين','شاهين بلس','شاهين برو');

-- 2) نصوص الأدوات: عدد اللهجات
update public.tools set description = 'أصوات طبيعية بـ 12 لهجة عربية، واستنساخ صوتك بموافقتك.' where id = 'voice';

-- 3) وحدات الأدوات (إن ما شغّلتها قبل)
update public.tools set cost_unit = 'إعلان' where id = 'free-ad';
update public.tools set cost_unit = 'دعوة'  where id = 'free-invite';
update public.tools set cost_unit = 'بطاقة' where id = 'free-card';
update public.tools set cost_unit = 'شريحة' where id = 'free-deck';
update public.tools set cost_unit = 'سيرة'  where id = 'free-cv';

-- تحقق
select name, price_kwd, sort_order from public.plans order by sort_order;
