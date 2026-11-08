import { supabaseConfigured } from "@/components/SetupNotice";
import Link from "next/link";
import { CheckNowButton } from "@/components/CheckNowButton";
import { checkNow } from "./actions";
import { StatusLabel } from "@/components/StatusDot";
import { UptimeBar } from "@/components/UptimeBar";
import { createClient } from "@/lib/supabase/server";
import type { Monitor } from "@/lib/types";
import { fillDays, summarize, timeAgo, type DailyRow } from "@/lib/uptime";

export const metadata = { title: "Dashboard — NEONDEV Pulse" };
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monitors")
    .select("id, name, url, interval_minutes, current_status, last_checked_at, is_active")
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <div className="glass mt-10 p-6">
        <p className="hud mb-2">Error</p>
        <p className="text-ink">Couldn&apos;t load monitors: {error.message}</p>
        <p className="mt-2 text-sm text-muted">Did you run supabase/migrations/0001_init.sql?</p>
      </div>
    );
  }

  const monitors = (data ?? []) as Monitor[];

  const rows = await Promise.all(
    monitors.map(async (m) => {
      const { data: daily } = await supabase.rpc("monitor_daily_uptime", { p_monitor: m.id, p_days: 90 });
      const d = (daily ?? []) as DailyRow[];
      return { monitor: m, history: fillDays(d, 45), s30: summarize(d, 30) };
    }),
  );

  const active = monitors.filter((m) => m.is_active);
  const up = active.filter((m) => m.current_status === "up").length;
  const withUptime = rows.filter((r) => r.s30.uptime !== null);
  const avgUptime = withUptime.length
    ? withUptime.reduce((a, r) => a + r.s30.uptime!, 0) / withUptime.length
    : null;
  const withMs = rows.filter((r) => r.s30.avgMs !== null);
  const avgMs = withMs.length ? Math.round(withMs.reduce((a, r) => a + r.s30.avgMs!, 0) / withMs.length) : null;

  const stats = [
    { label: "Monitors up", value: `${up}/${active.length}` },
    { label: "Uptime · 30d", value: avgUptime === null ? "—" : `${avgUptime.toFixed(2)}%` },
    { label: "Avg response", value: avgMs === null ? "—" : `${avgMs} ms` },
    { label: "Total monitors", value: String(monitors.length) },
  ];

  return (
    <main>
      <div className="mb-8 mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hud mb-3">Overview</p>
          <h1 className="display text-4xl sm:text-5xl">Monitors</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {active.length > 0 && (
            <form action={checkNow}>
              <CheckNowButton />
            </form>
          )}
          <Link
            href="/dashboard/new"
            className="rounded-lg bg-lime px-4 py-2.5 text-sm font-bold text-bg transition-transform hover:-translate-y-0.5"
          >
            + Add monitor
          </Link>
        </div>
      </div>

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass p-5">
            <p className="hud mb-3">{s.label}</p>
            <p className="text-2xl font-black tracking-tight text-ink sm:text-3xl">{s.value}</p>
          </div>
        ))}
      </section>

      {monitors.length === 0 ? (
        <section className="glass flex flex-col items-center px-6 py-16 text-center">
          <p className="hud mb-4">No monitors yet</p>
          <h2 className="mb-3 text-2xl font-black tracking-tight text-ink">Add your first site</h2>
          <p className="mb-8 max-w-sm text-sm text-muted">
            Paste a URL and Pulse will check it every few minutes, track uptime and response time.
          </p>
          <Link href="/dashboard/new" className="rounded-lg bg-lime px-5 py-2.5 text-sm font-bold text-bg">
            + Add monitor
          </Link>
        </section>
      ) : (
        <section className="glass divide-y divide-line/70 overflow-hidden">
          {rows.map(({ monitor: m, history, s30 }) => (
            <article
              key={m.id}
              className={`grid gap-4 p-5 sm:p-6 md:grid-cols-[1.2fr_1fr_auto] md:items-center ${m.is_active ? "" : "opacity-55"}`}
            >
              <div className="min-w-0">
                <h2 className="truncate text-base font-extrabold text-ink">{m.name}</h2>
                <p className="truncate font-mono text-xs text-dim">{m.url}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                  {m.is_active ? <StatusLabel status={m.current_status} /> : <span className="hud">Paused</span>}
                  <span className="hud">
                    every {m.interval_minutes}m · {timeAgo(m.last_checked_at)}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <UptimeBar days={history} />
                <p className="hud mt-2">{s30.uptime === null ? "No data yet" : `${s30.uptime.toFixed(2)}% · 30d`}</p>
              </div>
              <div className="flex items-center gap-4 md:flex-col md:items-end">
                <span className="font-mono text-sm text-body">{s30.avgMs === null ? "— ms" : `${s30.avgMs} ms`}</span>
                <Link
                  href={`/dashboard/${m.id}/edit`}
                  className="rounded-md border border-line px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-neon-indigo/60 hover:text-ink"
                >
                  Edit
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
