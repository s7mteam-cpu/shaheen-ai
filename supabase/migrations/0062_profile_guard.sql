-- v227: an extra guard on profiles (added beside the existing one, nothing replaced).
-- A signed-in customer can edit only name / phone / country / instagram of their own row; this stops a direct
-- request from changing the sign-up date or the «trial declined» mark, and keeps the texts short.
create or replace function public.protect_profile_extra() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.role() = 'authenticated' and not public.is_admin() then
    new.created_at := old.created_at;
    new.trial_declined_at := old.trial_declined_at;
    new.full_name := left(new.full_name, 80);
    new.instagram := left(new.instagram, 60);
    new.phone := left(new.phone, 25);
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_extra on public.profiles;
create trigger protect_profile_extra before update on public.profiles
  for each row execute function public.protect_profile_extra();
