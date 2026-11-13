-- v75: الدول العربية والعملات. دولة كل عميل (للعملة واللهجة والتواصل)، والأسعار تظل بالدينار.
alter table public.profiles add column if not exists country text check (country is null or country ~ '^[A-Z]{2}$');
create index if not exists profiles_country_idx on public.profiles (country);

-- العملاء الحاليين: دولتهم من مفتاح رقمهم (كل الدول العربية)، وإذا مو واضح: الكويت
update public.profiles set country = case
  when phone like '+966%' then 'SA'
  when phone like '+971%' then 'AE'
  when phone like '+974%' then 'QA'
  when phone like '+973%' then 'BH'
  when phone like '+968%' then 'OM'
  when phone like '+965%' then 'KW'
  when phone like '+962%' then 'JO'
  when phone like '+213%' then 'DZ'
  when phone like '+249%' then 'SD'
  when phone like '+252%' then 'SO'
  when phone like '+964%' then 'IQ'
  when phone like '+212%' then 'MA'
  when phone like '+967%' then 'YE'
  when phone like '+216%' then 'TN'
  when phone like '+269%' then 'KM'
  when phone like '+253%' then 'DJ'
  when phone like '+963%' then 'SY'
  when phone like '+970%' then 'PS'
  when phone like '+961%' then 'LB'
  when phone like '+218%' then 'LY'
  when phone like '+222%' then 'MR'
  when phone like '+20%' then 'EG'
  else 'KW' end
where country is null and role = 'user';

-- السياسات (الشروط والخصوصية والاسترجاع والمحتوى) انضافت لها فقرة الدول والعملات.
-- إذا كنت معدّل أي سياسة من لوحة الإدارة، نسختك تظل مثل ما هي (ما نغيّر نصوصك) — والتنبيه تحت يقول لك.
select 'v75 ok' as result,
  case when exists (select 1 from public.site_content where key = 'legal'
                    and (value ? 'terms' or value ? 'privacy' or value ? 'refund' or value ? 'content'))
       then 'تنبيه: عندك سياسة معدّلة من الإدارة — فقرة الدول ما بتظهر فيها إلا إذا أضفتها بنفسك'
       else 'السياسات بتتحدث تلقائياً' end as legal;
