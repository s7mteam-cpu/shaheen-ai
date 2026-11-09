-- Choose which AI provider runs each tool (editable from /admin/tools)
alter table public.tools add column if not exists provider text;
update public.tools set provider = case id
  when 'image' then 'fal' when 'product-photo' then 'fal' when 'ad-design' then 'fal'
  when 'motion-video' then 'fal' when 'avatar-video' then 'fal'
  when 'video-editing' then 'elevenlabs' when 'voice' then 'elevenlabs' when 'nasheed' then 'elevenlabs' end
where provider is null;
