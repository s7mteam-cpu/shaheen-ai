-- v245: «تكلفة كل طلب» — كل نداء لمزود ذكاء اصطناعي ينكتب هنا مع الطلب اللي يخصه (توكنات Claude و Gemini، وحروف صوت ElevenLabs).
-- للإدارة فقط: الجدول مقفول بـ RLS وما له أي سياسة، فما يقرأه ولا يكتبه إلا الخادم.
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  job_id uuid,
  user_id uuid,
  tool_id text,
  source text,
  provider text not null,
  model text not null default '',
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read integer not null default 0,
  cache_write integer not null default 0,
  units integer not null default 0
);
create index if not exists ai_usage_created_idx on public.ai_usage (created_at desc);
create index if not exists ai_usage_job_idx on public.ai_usage (job_id);
alter table public.ai_usage enable row level security;
