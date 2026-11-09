-- Rename & reorder tools for the simplified customer menu
update public.tools set name = v.name, sort_order = v.ord
from (values
  ('image','إنشاء بوست',1),
  ('motion-video','إنشاء فيديو موشن جرافيك',2),
  ('video-editing','مونتاج الفيديو',3),
  ('avatar-video','فيديو بشخصية واقعية',4),
  ('ad-design','تصميم الإعلانات',5),
  ('voice','تحويل النص إلى أصوات عربية',6),
  ('nasheed','إنشاء همهمة إسلامية',7),
  ('product-photo','تصوير المنتجات',8)
) as v(id,name,ord) where public.tools.id = v.id;

-- Main admin account gets the admin role automatically on signup
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare ref_id uuid;
begin
  if new.raw_user_meta_data ? 'ref' then
    select id into ref_id from profiles where referral_code = new.raw_user_meta_data->>'ref';
  end if;
  insert into profiles (id, email, full_name, referred_by, role)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
          ref_id,
          case when lower(new.email) = 's7m.team@gmail.com' then 'admin' else 'user' end);
  return new;
end $$;
