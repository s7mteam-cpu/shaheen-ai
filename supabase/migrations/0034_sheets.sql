-- v76: ربط Google Sheets. أي تغيير بالبيانات يأشّر إن الملف يحتاج تحديث، والمنصة تحدّثه خلال دقايق.
-- ما يسوي شي إذا الربط مو مفعّل (ما فيه سطر 'sheets').
create or replace function public.sheets_mark_dirty() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.admin_secrets set value = value || '{"dirty": true}'::jsonb
   where key = 'sheets' and coalesce(value->>'dirty', 'false') <> 'true';
  return null;
end $$;
revoke all on function public.sheets_mark_dirty() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','subscriptions','credit_ledger','income','expenses','recurring_expenses','tap_charges','plans','tools',
    'brand_kits','leads','admin_audit','blocked_emails','closed_accounts','user_events','support_access','price_history',
    'partners','partner_moves','employees','finance_periods'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists sheets_dirty on public.%I', t);
      execute format('create trigger sheets_dirty after insert or update or delete on public.%I for each statement execute function public.sheets_mark_dirty()', t);
    end if;
  end loop;
  -- الطلبات تتحدّث كثير وهي تشتغل (نسبة التقدم)، فنأشّر بس لما ينضاف طلب أو ينحذف أو تتغيّر حالته
  if to_regclass('public.jobs') is not null then
    drop trigger if exists sheets_dirty on public.jobs;
    create trigger sheets_dirty after insert or delete or update of status on public.jobs for each statement execute function public.sheets_mark_dirty();
  end if;
end $$;

select 'v76 ok' as result,
  (select count(*) from pg_trigger where tgname = 'sheets_dirty') as tables_watched;
