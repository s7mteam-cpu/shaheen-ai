-- v62 (Nov 2026): security hardening.
-- 1) Uploads bucket: only the file types the site uses, and a size cap — even for someone calling the storage API directly.
update storage.buckets
   set file_size_limit = 209715200,  -- 200 MB (the plan's own per-file limit still applies first)
       allowed_mime_types = array['image/png','image/jpeg','image/webp','video/mp4','video/quicktime','video/webm','audio/*']
 where id = 'uploads';

-- 2) A brand kit can only point at the owner's own uploaded files (logo + style pictures).
create or replace function public.protect_brand_paths() returns trigger
language plpgsql as $$
begin
  if new.logo_url is not null and (split_part(new.logo_url, '/', 1) <> new.user_id::text or position('..' in new.logo_url) > 0) then
    new.logo_url := null;
  end if;
  new.style_refs := coalesce((select array_agg(p) from unnest(coalesce(new.style_refs, '{}')) p
                               where split_part(p, '/', 1) = new.user_id::text and position('..' in p) = 0), '{}');
  return new;
end $$;
drop trigger if exists protect_brand_paths on public.brand_kits;
create trigger protect_brand_paths before insert or update on public.brand_kits
  for each row execute function public.protect_brand_paths();

-- 3) Customers can't change their own sign-in email copy in profiles (admins match people by it).
create or replace function public.protect_profile_columns() returns trigger
language plpgsql as $$
begin
  if auth.role() = 'authenticated' and not public.is_admin() then
    new.role := old.role; new.credits := old.credits; new.plan_id := old.plan_id;
    new.is_suspended := old.is_suspended; new.stripe_customer_id := old.stripe_customer_id;
    new.referred_by := old.referred_by; new.referral_code := old.referral_code;
    new.admin_perms := old.admin_perms; new.email := old.email;
  end if;
  return new;
end $$;

select 'v62 ok' as result,
  (select file_size_limit from storage.buckets where id = 'uploads') as uploads_limit,
  (select count(*) from pg_trigger where tgname = 'protect_brand_paths') as brand_guard;
