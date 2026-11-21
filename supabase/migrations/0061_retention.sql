-- v226: «مدة حفظ الملفات» — auto-delete of finished results after N days (default 45), with a notice 7 days before.
alter table public.jobs add column if not exists expire_warned_at timestamptz;
alter table public.jobs add column if not exists expired_at timestamptz;
create index if not exists jobs_retention_idx on public.jobs (created_at) where expired_at is null;
