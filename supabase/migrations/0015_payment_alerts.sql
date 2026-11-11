-- v28 (Nov 2026): every payment through the website notifies the admins (and the customer) by itself.
create or replace function public.notify_income() returns trigger
language plpgsql security definer set search_path = public as $$
declare amt text;
begin
  if new.source = 'manual' then return new; end if;
  amt := trim(to_char(new.amount, 'FM999G999G990D000')) || case when new.currency = 'KWD' then ' د.ك' else ' $' end;
  -- the bell of every full admin, and of staff who can open «المالية»
  insert into notifications(user_id, kind, title, body, link)
  select id, 'payment', '💰 دفعة جديدة: ' || amt,
         new.description || coalesce(' — ' || new.customer_name, ''), '/admin/finance?tab=income'
  from profiles where role = 'admin' or (role = 'staff' and 'finance' = any(coalesce(admin_perms, '{}')));
  -- a receipt line for the customer who paid
  if new.customer_id is not null then
    insert into notifications(user_id, kind, title, body, link)
    values (new.customer_id, 'payment', 'وصلت دفعتك ✓', new.description || ' — ' || amt || '. شكراً لك!', '/app/account?tab=inv');
  end if;
  return new;
end $$;
drop trigger if exists notify_income on public.income;
create trigger notify_income after insert on public.income for each row execute function public.notify_income();

select 'v28 ok' as result, (select count(*) from pg_trigger where tgname = 'notify_income') as payment_alerts;
