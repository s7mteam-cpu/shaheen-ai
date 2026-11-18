-- فصل اللهجة السورية عن الأردنية: غيدا سورية، وليلى ولينا أردنيتين. كلهم يظلون «شامي» عام كمان.
-- يعدّل فقط هالأصوات الثلاثة (بالمعرّف)، وإذا انت غيّرت لهجاتهم من الإدارة يرجّعها لهالقيم.
update public.site_content
set value = jsonb_set(
  value, '{items}',
  (select coalesce(jsonb_agg(
     case e->>'id'
       when 'rFDdsCQRZCUL8cPOWtnP' then jsonb_set(e, '{dialects}', '["syrian","levantine"]'::jsonb)
       when 'g3YpdjT1OTh9cunaumJs' then jsonb_set(e, '{dialects}', '["jordanian","levantine"]'::jsonb)
       when '6ZvbKYJmZfL6zVBzLwpV' then jsonb_set(e, '{dialects}', '["jordanian","levantine"]'::jsonb)
       else e end), '[]'::jsonb)
   from jsonb_array_elements(coalesce(value->'items','[]'::jsonb)) e))
where key = 'voices';
