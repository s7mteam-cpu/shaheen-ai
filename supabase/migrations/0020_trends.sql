-- Trends lab: weekly research + what customers actually choose → suggestions the admin approves.
create table if not exists public.trends (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  origin text not null default 'research' check (origin in ('research', 'customers')),
  scope text not null default 'all' check (scope in ('all', 'post', 'ads', 'carousel', 'motion', 'montage', 'lesson')),
  industry text not null default 'all',        -- an industry id (restaurant…), a group label, or 'all'
  title text not null,
  insight text not null default '',            -- what is happening
  instruction text not null,                   -- what our AI should do about it
  sources jsonb not null default '[]',         -- [{title, url}]
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_at timestamptz,
  expires_at timestamptz
);
create index if not exists trends_status_idx on public.trends (status, industry);
alter table public.trends enable row level security;   -- server (service role) only
