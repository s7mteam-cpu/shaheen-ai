-- v69: «سجل تغيير الأسعار»: كل تغيير بسعر باقة أو ريشها، أو بكلفة أداة، أو بسعر الدولار، ينحفظ بتاريخه ومين غيّره.
-- الطلبات والدفعات القديمة تظل بسعرها وقتها (محفوظ بكل سطر)، والجديدة تمشي على السعر الجديد.
create table if not exists public.price_history (
  id bigserial primary key,
  kind text not null check (kind in ('plan','tool','setting')),
  item_id text not null,
  item_name text,
  field text not null,
  old_value text,
  new_value text,
  changed_by text,
  created_at timestamptz not null default now()
);
create index if not exists price_history_time_idx on public.price_history (created_at desc);
alter table public.price_history enable row level security;
revoke all on public.price_history from anon, authenticated;

-- نقطة البداية: الأسعار الحالية كأول سطر بالسجل
insert into public.price_history (kind, item_id, item_name, field, old_value, new_value, changed_by)
select 'plan', id, name, f.field, null, f.val, 'الأسعار وقت تشغيل v69'
from public.plans p, lateral (values ('price_kwd', p.price_kwd::text), ('credits', p.credits::text), ('bonus_credits', coalesce(p.bonus_credits, 0)::text)) as f(field, val)
where not exists (select 1 from public.price_history);
insert into public.price_history (kind, item_id, item_name, field, old_value, new_value, changed_by)
select 'tool', id, name, f.field, null, f.val, 'الأسعار وقت تشغيل v69'
from public.tools t, lateral (values ('credit_cost', t.credit_cost::text), ('edit_cost', coalesce(t.edit_cost, 0)::text)) as f(field, val)
where not exists (select 1 from public.price_history where kind = 'tool');

select 'v69 ok' as result, (select count(*) from public.price_history) as starting_rows;
