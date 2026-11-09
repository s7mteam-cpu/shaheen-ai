-- "تعديل" after a result: each tool has its own edit price, and edits link to their original.
alter table public.tools add column if not exists edit_cost integer not null default 2;
update public.tools set edit_cost = case id
  when 'image' then 2 when 'product-photo' then 2 when 'ad-design' then 2
  when 'motion-video' then 5 when 'avatar-video' then 5 when 'video-editing' then 3
  when 'voice' then 1 when 'nasheed' then 3 else edit_cost end;
alter table public.jobs add column if not exists parent_job_id uuid references public.jobs(id) on delete set null;
-- model names are optional now (empty = provider default)
update public.tools set provider_model = null where provider_model like 'worker:%' or provider_model like 'elevenlabs:%';
