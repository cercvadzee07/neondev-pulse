-- NEONDEV Pulse — initial schema
-- Run in Supabase: SQL Editor → New query → paste → Run.

-- ───────────── Monitors ─────────────
create table public.monitors (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name             text not null check (char_length(name) between 1 and 80),
  url              text not null check (url ~* '^https?://'),
  method           text not null default 'GET' check (method in ('GET', 'HEAD')),
  interval_minutes int  not null default 5 check (interval_minutes in (5, 10, 15, 30, 60)),
  expected_status  int  not null default 200,
  timeout_ms       int  not null default 10000 check (timeout_ms between 1000 and 30000),
  is_active        boolean not null default true,
  current_status   text not null default 'pending' check (current_status in ('up', 'down', 'pending')),
  last_checked_at  timestamptz,
  created_at       timestamptz not null default now()
);
create index monitors_user_idx on public.monitors (user_id);
create index monitors_due_idx on public.monitors (is_active, last_checked_at);

-- ───────────── Checks (one row per ping) ─────────────
create table public.checks (
  id               bigint generated always as identity primary key,
  monitor_id       uuid not null references public.monitors(id) on delete cascade,
  checked_at       timestamptz not null default now(),
  status           text not null check (status in ('up', 'down')),
  status_code      int,
  response_time_ms int,
  error            text
);
create index checks_monitor_time_idx on public.checks (monitor_id, checked_at desc);

-- ───────────── Incidents (a continuous period of downtime) ─────────────
create table public.incidents (
  id           uuid primary key default gen_random_uuid(),
  monitor_id   uuid not null references public.monitors(id) on delete cascade,
  started_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  cause        text,
  notes        text
);
create index incidents_monitor_idx on public.incidents (monitor_id, started_at desc);
-- At most one open incident per monitor
create unique index incidents_one_open_idx on public.incidents (monitor_id) where resolved_at is null;

-- ───────────── Public status pages ─────────────
create table public.status_pages (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  slug         text not null unique check (slug ~ '^[a-z0-9](-?[a-z0-9])*$' and char_length(slug) between 3 and 40),
  title        text not null,
  description  text,
  is_public    boolean not null default true,
  created_at   timestamptz not null default now()
);

create table public.status_page_monitors (
  status_page_id uuid not null references public.status_pages(id) on delete cascade,
  monitor_id     uuid not null references public.monitors(id) on delete cascade,
  display_name   text,
  sort_order     int not null default 0,
  primary key (status_page_id, monitor_id)
);

-- ───────────── Row Level Security ─────────────
alter table public.monitors             enable row level security;
alter table public.checks               enable row level security;
alter table public.incidents            enable row level security;
alter table public.status_pages         enable row level security;
alter table public.status_page_monitors enable row level security;

-- Is this monitor shown on any public status page?
create or replace function public.is_monitor_public(p_monitor uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from status_page_monitors spm
    join status_pages sp on sp.id = spm.status_page_id
    where spm.monitor_id = p_monitor and sp.is_public
  );
$$;

-- Owners: full control of their own rows
create policy "own monitors" on public.monitors
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own status pages" on public.status_pages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own status page monitors" on public.status_page_monitors
  for all using (
    exists (select 1 from status_pages sp where sp.id = status_page_id and sp.user_id = auth.uid())
  ) with check (
    exists (select 1 from status_pages sp where sp.id = status_page_id and sp.user_id = auth.uid())
    and exists (select 1 from monitors m where m.id = monitor_id and m.user_id = auth.uid())
  );

create policy "read own checks" on public.checks
  for select using (exists (select 1 from monitors m where m.id = monitor_id and m.user_id = auth.uid()));

create policy "own incidents" on public.incidents
  for all using (exists (select 1 from monitors m where m.id = monitor_id and m.user_id = auth.uid()))
  with check (exists (select 1 from monitors m where m.id = monitor_id and m.user_id = auth.uid()));

-- Visitors (anon): read-only access to anything on a public status page
create policy "public pages readable" on public.status_pages
  for select using (is_public);

create policy "public page monitors readable" on public.status_page_monitors
  for select using (exists (select 1 from status_pages sp where sp.id = status_page_id and sp.is_public));

create policy "public monitors readable" on public.monitors
  for select using (public.is_monitor_public(id));

create policy "public checks readable" on public.checks
  for select using (public.is_monitor_public(monitor_id));

create policy "public incidents readable" on public.incidents
  for select using (public.is_monitor_public(monitor_id));

-- Checks are written only by the check engine (service role bypasses RLS).

-- ───────────── Daily uptime (for the 90-day bar) ─────────────
create or replace function public.monitor_daily_uptime(p_monitor uuid, p_days int default 90)
returns table (day date, uptime_pct numeric, avg_ms numeric, checks int)
language sql stable security invoker set search_path = public
as $$
  select
    (checked_at at time zone 'utc')::date as day,
    round(100.0 * count(*) filter (where status = 'up') / count(*), 3) as uptime_pct,
    round(avg(response_time_ms) filter (where status = 'up'), 0)     as avg_ms,
    count(*)::int                                                        as checks
  from checks
  where monitor_id = p_monitor
    and checked_at >= (now() at time zone 'utc')::date - (p_days - 1)
  group by 1
  order by 1;
$$;

-- ───────────── Housekeeping: keep 90 days of raw checks ─────────────
create or replace function public.prune_old_checks()
returns void
language sql security definer set search_path = public
as $$
  delete from checks where checked_at < now() - interval '90 days';
$$;
revoke execute on function public.prune_old_checks() from public, anon, authenticated;
