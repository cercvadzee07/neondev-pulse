import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const USER_AGENT = "NEONDEV-Pulse/1.0 (+uptime monitor)";
const CONCURRENCY = 8;
const RETRY_DELAY_MS = 1500;
/** Cron runs every 5 min with jitter — treat a monitor as due slightly early. */
const DUE_GRACE_MS = 60_000;

export interface MonitorRow {
  id: string;
  user_id: string;
  name: string;
  url: string;
  method: "GET" | "HEAD";
  expected_status: number;
  timeout_ms: number;
  interval_minutes: number;
  current_status: "up" | "down" | "pending";
  last_checked_at: string | null;
  notify_email?: boolean;
}

export interface PingResult {
  status: "up" | "down";
  status_code: number | null;
  response_time_ms: number | null;
  error: string | null;
}

export interface Transition {
  monitor: MonitorRow;
  from: MonitorRow["current_status"];
  to: "up" | "down";
  error: string | null;
  at: string;
  /** Set on recovery: how long the incident lasted. */
  downtimeMs?: number;
}

export interface RunSummary {
  checked: number;
  up: number;
  down: number;
  transitions: Transition[];
  durationMs: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function ping(m: Pick<MonitorRow, "url" | "method" | "expected_status" | "timeout_ms">): Promise<PingResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), m.timeout_ms);
  const t0 = performance.now();
  try {
    const res = await fetch(m.url, {
      method: m.method,
      redirect: "follow",
      cache: "no-store",
      signal: ctrl.signal,
      headers: { "user-agent": USER_AGENT, accept: "*/*" },
    });
    const ms = Math.round(performance.now() - t0);
    res.body?.cancel().catch(() => {});
    // "200" means "any 2xx"; any other expected code must match exactly.
    const ok = m.expected_status === 200 ? res.ok : res.status === m.expected_status;
    return {
      status: ok ? "up" : "down",
      status_code: res.status,
      response_time_ms: ms,
      error: ok ? null : `HTTP ${res.status} (expected ${m.expected_status === 200 ? "2xx" : m.expected_status})`,
    };
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string } };
    const error =
      err.name === "AbortError"
        ? `Timeout after ${m.timeout_ms / 1000}s`
        : err.cause?.code
          ? `${err.cause.code}${err.cause.message ? `: ${err.cause.message}` : ""}`
          : err.message;
    return { status: "down", status_code: null, response_time_ms: null, error };
  } finally {
    clearTimeout(timer);
  }
}

/** Ping, and retry once before declaring a site down (filters out blips). */
async function pingWithRetry(m: MonitorRow): Promise<PingResult> {
  const first = await ping(m);
  if (first.status === "up") return first;
  await sleep(RETRY_DELAY_MS);
  return ping(m);
}

async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

function isDue(m: MonitorRow, now: number, minGapMs?: number) {
  if (!m.last_checked_at) return true;
  const since = now - new Date(m.last_checked_at).getTime();
  return since >= (minGapMs ?? m.interval_minutes * 60_000 - DUE_GRACE_MS);
}

/**
 * Run checks for all due monitors (or a specific set).
 * Must be called with the service-role client — writes bypass RLS.
 */
export async function runChecks(
  admin: SupabaseClient,
  opts: { monitorIds?: string[]; minGapMs?: number } = {},
): Promise<RunSummary> {
  const started = Date.now();

  let q = admin
    .from("monitors")
    .select("*")
    .eq("is_active", true);
  if (opts.monitorIds) q = q.in("id", opts.monitorIds);

  const { data, error } = await q;
  if (error) throw new Error(`Load monitors: ${error.message}`);

  const now = Date.now();
  const due = ((data ?? []) as MonitorRow[]).filter((m) => isDue(m, now, opts.minGapMs));
  if (!due.length) return { checked: 0, up: 0, down: 0, transitions: [], durationMs: Date.now() - started };

  const results = await pool(due, CONCURRENCY, pingWithRetry);
  const checkedAt = new Date().toISOString();

  const { error: insErr } = await admin.from("checks").insert(
    due.map((m, i) => ({ monitor_id: m.id, checked_at: checkedAt, ...results[i] })),
  );
  if (insErr) throw new Error(`Insert checks: ${insErr.message}`);

  const transitions: Transition[] = [];

  await pool(due.map((m, i) => [m, results[i]] as const), CONCURRENCY, async ([m, r]) => {
    await admin.from("monitors").update({ current_status: r.status, last_checked_at: checkedAt }).eq("id", m.id);

    if (r.status === "down") {
      // Opens an incident unless one is already open (unique partial index).
      const { error: incErr } = await admin
        .from("incidents")
        .insert({ monitor_id: m.id, started_at: checkedAt, cause: r.error });
      const opened = !incErr;
      if (opened && m.current_status !== "down") {
        transitions.push({ monitor: m, from: m.current_status, to: "down", error: r.error, at: checkedAt });
      }
    } else {
      const { data: closed } = await admin
        .from("incidents")
        .update({ resolved_at: checkedAt })
        .eq("monitor_id", m.id)
        .is("resolved_at", null)
        .select("started_at");
      if (closed?.length && m.current_status === "down") {
        transitions.push({
          monitor: m,
          from: "down",
          to: "up",
          error: null,
          at: checkedAt,
          downtimeMs: new Date(checkedAt).getTime() - new Date(closed[0].started_at).getTime(),
        });
      }
    }
  });

  const up = results.filter((r) => r.status === "up").length;
  return { checked: due.length, up, down: due.length - up, transitions, durationMs: Date.now() - started };
}
