-- v74: «إقفال الدورة المحاسبية». بعد الإقفال ما أحد يقدر يضيف أو يعدّل أو يحذف إيراد أو مصروف أو سحب/إيداع بتاريخ داخلها،
-- حتى من قاعدة البيانات مباشرة. وتقرير الإقفال ينحفظ كملف ثابت.
-- (حذف حساب عميل يظل يشتغل: يشيل اسمه من الإيراد بس، وما يغيّر المبلغ ولا التاريخ.)
alter table public.finance_periods add column if not exists closed_at timestamptz;
alter table public.finance_periods add column if not exists closed_by text;
alter table public.finance_periods add column if not exists snapshot jsonb;
alter table public.finance_periods add column if not exists report_path text;
alter table public.finance_periods add column if not exists reopen_log jsonb not null default '[]';

create or replace function public.block_closed_period() returns trigger language plpgsql as $$
declare d_old date; d_new date; col text := tg_argv[0];
begin
  if tg_op in ('UPDATE','DELETE') then execute format('select ($1).%I', col) using old into d_old; end if;
  if tg_op in ('UPDATE','INSERT') then execute format('select ($1).%I', col) using new into d_new; end if;
  if exists (select 1 from public.finance_periods p where p.closed_at is not null
             and ((d_old is not null and d_old between p.starts_on and p.ends_on) or (d_new is not null and d_new between p.starts_on and p.ends_on))) then
    raise exception 'period_closed: هذا التاريخ داخل دورة محاسبية مقفلة';
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists lock_closed_expenses on public.expenses;
create trigger lock_closed_expenses before insert or delete or update of spent_on, amount, currency, category, vendor on public.expenses for each row execute function public.block_closed_period('spent_on');
drop trigger if exists lock_closed_income on public.income;
create trigger lock_closed_income before insert or delete or update of received_on, amount, currency, description on public.income for each row execute function public.block_closed_period('received_on');
drop trigger if exists lock_closed_moves on public.partner_moves;
create trigger lock_closed_moves before insert or delete or update of moved_on, amount, currency, kind, partner_id on public.partner_moves for each row execute function public.block_closed_period('moved_on');

select 'v74 ok' as result;
