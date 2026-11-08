-- NEONDEV Pulse — Phase 5: per-monitor email alerts
-- Run in Supabase: SQL Editor → New query → paste → Run.

alter table public.monitors
  add column if not exists notify_email boolean not null default true;
