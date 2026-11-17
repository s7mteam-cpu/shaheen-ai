-- Weekly auto-prepare of the content plan (Saturday 9am Kuwait): customer switch + small state for the scheduler.
alter table public.brand_kits add column if not exists auto_weekly boolean not null default false;
alter table public.brand_kits add column if not exists auto_state jsonb;
