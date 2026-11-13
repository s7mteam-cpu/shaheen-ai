-- v72: نوعين مصاريف زيادة: إيجار المكتب، والإقامات والتأشيرات.
alter table public.expenses drop constraint if exists expenses_category_check;
alter table public.expenses add constraint expenses_category_check
  check (category in ('fixed','yearly','usage','other','marketing','salaries','government','setup','operations','rent','residency'));
select 'v72 ok' as result;
