-- NEONDEV Pulse — scope owner-only policies to signed-in users.
-- After 0003, visitors can't read monitors.user_id, so owner checks must not run for them.
-- Run in Supabase: SQL Editor → New query → paste → Run.

drop policy if exists "read own checks" on public.checks;
create policy "read own checks" on public.checks
  for select to authenticated
  using (exists (select 1 from public.monitors m where m.id = monitor_id and m.user_id = auth.uid()));

drop policy if exists "own incidents" on public.incidents;
create policy "own incidents" on public.incidents
  for all to authenticated
  using (exists (select 1 from public.monitors m where m.id = monitor_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.monitors m where m.id = monitor_id and m.user_id = auth.uid()));

drop policy if exists "own monitors" on public.monitors;
create policy "own monitors" on public.monitors
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own status pages" on public.status_pages;
create policy "own status pages" on public.status_pages
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own status page monitors" on public.status_page_monitors;
create policy "own status page monitors" on public.status_page_monitors
  for all to authenticated
  using (exists (select 1 from public.status_pages sp where sp.id = status_page_id and sp.user_id = auth.uid()))
  with check (
    exists (select 1 from public.status_pages sp where sp.id = status_page_id and sp.user_id = auth.uid())
    and exists (select 1 from public.monitors m where m.id = monitor_id and m.user_id = auth.uid())
  );
