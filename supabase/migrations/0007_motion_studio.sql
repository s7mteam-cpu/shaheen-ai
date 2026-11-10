-- Motion-graphics studio: editable drafts (data, rendered by the worker with Remotion)
alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check check (status in ('draft','queued','running','done','failed'));

update public.tools
set provider = 'claude', provider_model = null, credit_cost = 10, edit_cost = 3, cost_unit = '15 ثانية',
    description = 'فيديو موشن جرافيك بنصوص عربية صحيحة، تعدّل ألوانه ونصوصه وخطه مباشرة، مع موسيقى وتعليق صوتي.'
where id = 'motion-video';
