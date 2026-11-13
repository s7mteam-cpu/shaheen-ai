-- v84: «تخطي التجربة المجانية» from the welcome screen gives up the free trial for good
alter table public.profiles add column if not exists trial_declined_at timestamptz;
select 'v84 ok' as result;
