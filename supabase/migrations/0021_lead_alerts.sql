-- v50: a new contact / management-service request rings the bell of the admins (and staff who handle «طلبات الإدارة»).
create or replace function public.notify_lead() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications(user_id, kind, title, body, link)
  select id, 'lead', '📩 طلب تواصل جديد: ' || new.name,
         new.phone || coalesce(' — ' || nullif(left(new.message, 120), ''), ''), '/admin/leads'
  from profiles where role = 'admin' or (role = 'staff' and 'leads' = any(coalesce(admin_perms, '{}')));
  return new;
end $$;
drop trigger if exists notify_lead on public.leads;
create trigger notify_lead after insert on public.leads for each row execute function public.notify_lead();

select 'v50 ok' as result, (select count(*) from pg_trigger where tgname = 'notify_lead') as lead_alerts;
