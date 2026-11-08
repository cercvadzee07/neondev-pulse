-- NEONDEV Pulse — Phase 6: public status page privacy
-- Visitors (anon role) may only read safe monitor columns — never URLs or settings.
-- Run in Supabase: SQL Editor → New query → paste → Run.

revoke select on public.monitors from anon;
grant select (id, name, current_status, last_checked_at, is_active) on public.monitors to anon;

-- Visitors don't need raw error messages or status codes either.
revoke select on public.checks from anon;
grant select (id, monitor_id, checked_at, status, response_time_ms) on public.checks to anon;

revoke select on public.incidents from anon;
grant select (id, monitor_id, started_at, resolved_at, notes) on public.incidents to anon;
