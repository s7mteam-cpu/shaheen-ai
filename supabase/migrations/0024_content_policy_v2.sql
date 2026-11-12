-- v59 (Nov 2026): the full «سياسة المحتوى» text. If the content policy was saved from the admin before,
-- this clears ONLY that saved copy (content / content_en) so the new full text shows. Terms, privacy and refund stay as they are.
update public.site_content set value = value - 'content' - 'content_en' where key = 'legal';

select 'v59 ok' as result;
