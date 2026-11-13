-- v80: «الدفع بالتحويل» — the customer transfers (bank, Sham Cash…), uploads the receipt, the admin approves.
-- The approved payment becomes a normal payment: it activates the plan, lands in «المالية» and in Google Sheets.

-- طرق التحويل: تضيفها وتعدّلها من لوحة الإدارة (الاسم، بيانات الحساب، الدول اللي تظهر لها)
create table if not exists public.transfer_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  details text not null default '',
  countries text[] not null default '{}',          -- فاضي = تظهر لكل الدول
  is_active boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- كل تحويل يرسله عميل (مع صورة الإيصال)
create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  method_id uuid references public.transfer_methods(id) on delete set null,
  method_name text not null,
  kind text not null check (kind in ('subscribe','renew','managed')),
  plan_id text references public.plans(id) on delete set null,
  months int not null default 1 check (months between 1 and 12),
  amount numeric(12,3) not null check (amount > 0),   -- بالدينار الكويتي
  paid_text text,                                      -- اللي كتبه العميل: «حوّلت 3,000,000 ل.س»
  receipt_path text,
  note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now()
);
create index if not exists transfers_status_idx on public.transfers (status, created_at desc);
create index if not exists transfers_user_idx on public.transfers (user_id);

-- الاشتراك المدفوع لأكثر من شهر: «مدفوع لين» (الريش تتجدد كل شهر لحالها لين هالتاريخ)
alter table public.subscriptions add column if not exists prepaid_until timestamptz;

alter table public.transfer_methods enable row level security;
alter table public.transfers enable row level security;
revoke all on public.transfer_methods, public.transfers from anon, authenticated;

-- جرس الإدارة: تحويل جديد ينتظر الموافقة
create or replace function public.notify_transfer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications(user_id, kind, title, body, link)
  select id, 'payment', '🏦 تحويل جديد ينتظر الموافقة',
         new.method_name || ' — ' || trim(to_char(new.amount, 'FM999G999G990D000')) || ' د.ك', '/admin/transfers'
  from profiles where role = 'admin' or (role = 'staff' and ('transfers' = any(coalesce(admin_perms, '{}')) or 'finance' = any(coalesce(admin_perms, '{}'))));
  return new;
end $$;
drop trigger if exists notify_transfer on public.transfers;
create trigger notify_transfer after insert on public.transfers for each row execute function public.notify_transfer();

-- Google Sheets: أي تغيير بالتحويلات يحدّث الملف (إذا كان تحديث v76 مشغّل)
do $$
begin
  if exists (select 1 from pg_proc where proname = 'sheets_mark_dirty') then
    drop trigger if exists sheets_dirty on public.transfers;
    create trigger sheets_dirty after insert or update or delete on public.transfers for each statement execute function public.sheets_mark_dirty();
    drop trigger if exists sheets_dirty on public.transfer_methods;
    create trigger sheets_dirty after insert or update or delete on public.transfer_methods for each statement execute function public.sheets_mark_dirty();
  end if;
end $$;

-- طريقتين جاهزتين (موقوفتين): حط بيانات حسابك من لوحة الإدارة وشغّلهم
insert into public.transfer_methods (name, details, countries, is_active, sort_order)
select * from (values
  ('🏦 تحويل بنكي - سوريا', 'اسم البنك: …' || chr(10) || 'اسم صاحب الحساب: …' || chr(10) || 'رقم الحساب: …', array['SY'], false, 1),
  ('📱 شام كاش', 'رقم المحفظة: …' || chr(10) || 'اسم صاحب المحفظة: …', array['SY'], false, 2)
) as v(name, details, countries, is_active, sort_order)
where not exists (select 1 from public.transfer_methods);

select 'v80 ok' as result,
  (select count(*) from public.transfer_methods) as transfer_methods,
  (select count(*) from pg_trigger where tgname = 'notify_transfer') as admin_alert;
