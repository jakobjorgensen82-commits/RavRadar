-- RavRadar 4.0.73: gør systemtestens oprydning mulig uden at ændre eksisterende loginopsætning.
-- Idempotent og sikker at køre flere gange. Ejeren/full_admin kan slette test- og fejlposter.
drop policy if exists handbook_review_delete on public.handbook_reviews;
create policy handbook_review_delete on public.handbook_reviews
for delete to authenticated
using (public.is_ravradar_owner() or public.has_ravradar_permission('full_admin'));
