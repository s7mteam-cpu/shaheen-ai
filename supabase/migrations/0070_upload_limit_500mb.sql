-- v272: بعد الترقية لخطة Supabase Pro: حد حجم الملف في مخزن الرفع من 200 إلى 500 ميجا (فيديو جوال 5 دقائق بدقة عالية).
-- يشتغل مع: حد المشروع العام من Storage ← Settings، ومتغير UPLOAD_VIDEO_MB=500 في Vercel.
update storage.buckets set file_size_limit = 524288000 where id = 'uploads';
