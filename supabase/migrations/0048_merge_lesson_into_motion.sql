-- v97: the educational video is now part of motion graphics (one tool).
-- Moves everything that belonged to «الفيديو التعليمي» to «الموشن جرافيك», then removes the old tool.

update public.jobs            set tool_id = 'motion-video' where tool_id = 'lesson-video';
update public.video_templates set tool_id = 'motion-video' where tool_id = 'lesson-video';
update public.gallery_items   set tool_id = 'motion-video', category = 'motion' where tool_id = 'lesson-video' or category = 'lesson';
delete from public.showcase_sections where cat = 'lesson';

update public.tools
   set description = 'فيديو موشن جرافيك لأي مجال: إعلان أو شرح تعليمي، رسوم تنرسم باليد أو كرتون خليجي يتكلم، بنصوص عربية صحيحة وتعدّلها بنفسك مع موسيقى وتعليق صوتي.'
 where id = 'motion-video';

delete from public.tools where id = 'lesson-video';
