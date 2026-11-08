import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckNowButton } from "@/components/CheckNowButton";
import { ResponseChart, type ChartPoint } from "@/components/ResponseChart";
import { supabaseConfigured } from "@/components/SetupNotice";
import { StatusLabel } from "@/components/StatusDot";
import { UptimeBar } from "@/components/UptimeBar";
import { createClient } from "@/lib/supabase/server";
import type { Incident, MonitorStatus } from "@/lib/types";
import { fillDays, summarize, timeAgo, type DailyRow } from "@/lib/uptime";
import { checkMonitorNow } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Monitor — NEONDEV Pulse" };

function fmtDuration(ms: number) {
  const m = Math.round(ms / 60_000);
  if (m < 1) return "< 1 min";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function MonitorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabaseConfigured) return null;
  const supabase = await createClient();

  const { data: m } = await supabase
    .from("monitors")
    .select("id, name, url, interval_minutes, expected_status, is_active, current_status, last_checked_at, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!m) notFound();

  const since24h = new Date(Date.now() - 86_400_000).toISOString();
  const [{ data: checks }, { data: daily }, { data: incidents }] = await Promise.all([
    supabase
      .from("checks")
      .select("checked_at, status, status_code, response_time_ms, error")
      .eq("monitor_id", id)
      .gte("checked_at", since24h)
      .order("checked_at", { ascending: true })
      .limit(2000),
    supabase.rpc("monitor_daily_uptime", { p_monitor: id, p_days: 90 }),
    supabase
      .from("incidents")
      .select("id, monitor_id, started_at, resolved_at, cause, notes")
      .eq("monitor_id", id)
      .order("started_at", { ascending: false })
      .limit(20),
  ]);

  const rows24 = checks ?? [];
  const up24 = rows24.filter((c) => c.status === "up");
  const uptime24 = rows24.length ? (up24.length / rows24.length) * 100 : null;
  const ms24 = up24.filter((c) => c.response_time_ms != null).map((c) => c.response_time_ms as number);
  const avg24 = ms24.length ? Math.round(ms24.reduce((a, b) => a + b, 0) / ms24.length) : null;

  const d = (daily ?? []) as DailyRow[];
  const s7 = summarize(d, 7);
  const s30 = summarize(d, 30);
  const history = fillDays(d, 90);

  const points: ChartPoint[] = rows24.map((c) => ({
    t: c.checked_at,
    ms: c.status === "up" ? c.response_time_ms : null,
    code: c.status_code,
    error: c.error,
  }));
  const recent = [...rows24].reverse().slice(0, 12);
  const incs = (incidents ?? []) as Incident[];
  const pct = (v: number | null) => (v === null ? "—" : `${v.toFixed(2)}%`);

  const stats = [
    { label: "Uptime · 24h", value: pct(uptime24) },
    { label: "Uptime · 7d", value: pct(s7.uptime) },
    { label: "Uptime · 30d", value: pct(s30.uptime) },
    { label: "Avg response · 24h", value: avg24 === null ? "—" : `${avg24} ms` },
  ];

  return (
    <main className="mt-6 space-y-6">
      <Link href="/dashboard" className="hud inline-block transition-colors hover:text-ink">
        ← All monitors
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-3">
            {m.is_active ? <StatusLabel status={m.current_status as MonitorStatus} /> : <span className="hud">Paused</span>}
          </div>
          <h1 className="display truncate text-4xl sm:text-5xl">{m.name}</h1>
          <a
            href={m.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block max-w-full truncate font-mono text-sm text-muted transition-colors hover:text-ink"
          >
            {m.url} ↗
          </a>
          <p className="hud mt-2">
            Every {m.interval_minutes} min · last check {timeAgo(m.last_checked_at)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {m.is_active && (
            <form action={checkMonitorNow}>
              <input type="hidden" name="id" value={m.id} />
              <CheckNowButton />
            </form>
          )}
          <Link
            href={`/dashboard/${m.id}/edit`}
            className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-neon-indigo/60"
          >
            Edit
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass p-5">
            <p className="hud mb-3">{s.label}</p>
            <p className="text-2xl font-black tracking-tight text-ink sm:text-3xl">{s.value}</p>
          </div>
        ))}
      </section>

      <section className="glass p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="hud">Response time // 24h</p>
          <p className="hud flex items-center gap-2">
            <span className="inline-block h-2.5 w-[3px] rounded-full bg-neon-lavender" /> failed check
          </p>
        </div>
        <ResponseChart points={points} />
      </section>

      <section className="glass p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="hud">Uptime // 90 days</p>
          <p className="hud">{pct(summarize(d, 90).uptime)}</p>
        </div>
        <UptimeBar days={history} />
        <div className="hud mt-2 flex justify-between">
          <span>90 days ago</span>
          <span>Today</span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass p-5 sm:p-6">
          <p className="hud mb-5">Incidents</p>
          {incs.length === 0 ? (
            <p className="text-sm text-muted">No incidents recorded. Clean record.</p>
          ) : (
            <ol className="relative space-y-5 border-l border-line pl-5">
              {incs.map((i) => {
                const open = !i.resolved_at;
                const dur = new Date(i.resolved_at ?? Date.now()).getTime() - new Date(i.started_at).getTime();
                return (
                  <li key={i.id} className="relative">
                    <span
                      className={`absolute -left-[26px] top-1.5 size-2.5 rounded-full ${
                        open ? "bg-neon-lavender" : "border border-dim bg-bg"
                      }`}
                    />
                    <p className="text-sm font-semibold text-ink">
                      {open ? "Ongoing outage" : "Resolved outage"}
                      <span className="ml-2 font-mono text-xs font-normal text-muted">{fmtDuration(dur)}</span>
                    </p>
                    <p className="hud mt-1">
                      {fmtDate(i.started_at)}
                      {i.resolved_at ? ` → ${fmtDate(i.resolved_at)}` : " → now"}
                    </p>
                    {i.cause && <p className="mt-1 font-mono text-xs text-body">{i.cause}</p>}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="glass p-5 sm:p-6">
          <p className="hud mb-5">Recent checks</p>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">No checks yet. Press “Check now”.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="hud">
                    <th className="pb-3 font-normal">Time</th>
                    <th className="pb-3 font-normal">Status</th>
                    <th className="pb-3 font-normal">Code</th>
                    <th className="pb-3 text-right font-normal">Response</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {recent.map((c) => (
                    <tr key={c.checked_at}>
                      <td className="py-2 font-mono text-xs text-muted">{fmtDate(c.checked_at)}</td>
                      <td className="py-2">
                        <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-body">
                          <span
                            className={`inline-block size-2 rounded-full ${
                              c.status === "up" ? "bg-lime" : "border-2 border-neon-lavender"
                            }`}
                          />
                          {c.status}
                        </span>
                      </td>
                      <td className="py-2 font-mono text-xs text-body">{c.status_code ?? "—"}</td>
                      <td className="py-2 text-right font-mono text-xs text-body" title={c.error ?? undefined}>
                        {c.response_time_ms != null ? `${c.response_time_ms} ms` : (c.error ?? "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
