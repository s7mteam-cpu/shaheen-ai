-- Requests for the social-media management service (and any "contact us" form)
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  message text,
  source text not null default 'managed_service',
  user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'new' check (status in ('new','contacted','won','closed')),
  created_at timestamptz not null default now()
);
alter table public.leads enable row level security;
create policy "admin leads" on public.leads for all using (public.is_admin()) with check (public.is_admin());
-- Inserts go through the server API (service role), so no public insert policy.
