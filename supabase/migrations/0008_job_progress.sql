-- Live progress (0-100) shown as a green bar while a job is being made
alter table public.jobs add column if not exists progress smallint not null default 0;
