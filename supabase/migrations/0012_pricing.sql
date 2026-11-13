-- New pricing (Nov 2026): plans 40/60/90 KWD with 500/800/1300 ريشة, and new tool costs.
update public.plans set price_kwd = 40, credits = 500 where id = 'starter';
update public.plans set price_kwd = 60, credits = 800 where id = 'shaheen';
update public.plans set price_kwd = 90, credits = 1300 where id = 'golden';

update public.tools t set credit_cost = v.cost, edit_cost = v.edit
from (values
  ('post',           5, 2),
  ('ad-design',      5, 2),
  ('carousel',       3, 2),   -- per slide
  ('image',          4, 2),
  ('product-photo',  6, 2),
  ('motion-video',  10, 5),
  ('video-editing', 10, 5),   -- per minute
  ('product-video', 15, 5),   -- per 5 seconds → 8s video = 30
  ('avatar-video',  30, 5),
  ('voice',          3, 1),   -- per 500 characters
  ('nasheed',       10, 3)
) as v(id, cost, edit)
where t.id = v.id;

select id, credit_cost, edit_cost, cost_unit from public.tools order by sort_order;
select id, price_kwd, credits from public.plans order by sort_order;

-- Monthly gift credits on top of the plan (shown as "+ N ريشة هدية")
alter table public.plans add column if not exists bonus_credits integer not null default 0;
update public.plans set bonus_credits = case id when 'shaheen' then 100 when 'golden' then 500 else 0 end;

create or replace function public.renew_credits(p_user uuid, p_plan text, p_invoice text)
returns void language plpgsql security definer set search_path = public as $$
declare plan_credits int; old_balance int;
begin
  if exists(select 1 from credit_ledger where ref = p_invoice and reason = 'subscription') then return; end if;
  select credits + coalesce(bonus_credits, 0) into plan_credits from plans where id = p_plan;
  select credits into old_balance from profiles where id = p_user for update;
  if old_balance > 0 then
    insert into credit_ledger(user_id, amount, reason, ref) values (p_user, -old_balance, 'renewal_reset', p_invoice);
  end if;
  update profiles set credits = plan_credits, plan_id = p_plan where id = p_user;
  insert into credit_ledger(user_id, amount, reason, ref) values (p_user, plan_credits, 'subscription', p_invoice);
end $$;
revoke execute on function public.renew_credits(uuid,text,text) from public, anon, authenticated;
grant execute on function public.renew_credits(uuid,text,text) to service_role;
