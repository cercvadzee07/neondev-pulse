import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { LogoMark } from "@/components/Logo";
import { StatusDot } from "@/components/StatusDot";
import { UptimeBar } from "@/components/UptimeBar";
import { createPublicClient } from "@/lib/supabase/public";
import type { MonitorStatus } from "@/lib/types";
import { fillDays, summarize, type DailyRow } from "@/lib/uptime";

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

async function loadPage(slug: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const db = createPublicClient();
  const { data: page } = await db
    .from("status_pages")
    .select("id, title, description, slug")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  return page ? { db, page } : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await loadPage(slug);
  if (!loaded) return { title: "Status page not found" };
  return {
    title: `${loaded.page.title} — Status`,
    description: loaded.page.description ?? `Live status and uptime for ${loaded.page.title}.`,
  };
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) +
  " UTC";

function fmtDuration(ms: number) {
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return h < 48 ? `${h}h ${m % 60}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
}

export default async function PublicStatusPage({ params }: Params) {
  const { slug } = await params;
  const loaded = await loadPage(slug);
  if (!loaded) notFound();
  const { db, page } = loaded;

  const { data: links } = await db
    .from("status_page_monitors")
    .select("monitor_id, display_name, sort_order")
    .eq("status_page_id", page.id)
    .order("sort_order");
  const ids = (links ?? []).map((l) => l.monitor_id as string);

  const [{ data: monitors }, { data: incidents }, dailies] = await Promise.all([
    ids.length
      ? db.from("monitors").select("id, name, current_status, is_active").in("id", ids)
      : Promise.resolve({ data: [] as { id: string; name: string; current_status: MonitorStatus; is_active: boolean }[] }),
    ids.length
      ? db
          .from("incidents")
          .select("id, monitor_id, started_at, resolved_at, notes")
          .in("monitor_id", ids)
          .gte("started_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
          .order("started_at", { ascending: false })
          .limit(15)
      : Promise.resolve({ data: [] as { id: string; monitor_id: string; started_at: string; resolved_at: string | null; notes: string | null }[] }),
    Promise.all(ids.map((id) => db.rpc("monitor_daily_uptime", { p_monitor: id, p_days: 90 }))),
  ]);

  const byId = new Map((monitors ?? []).map((m) => [m.id, m]));
  const services = (links ?? [])
    .map((l, i) => {
      const m = byId.get(l.monitor_id as string);
      if (!m) return null;
      const daily = (dailies[i]?.data ?? []) as DailyRow[];
      return {
        id: m.id,
        name: (l.display_name as string | null) || m.name,
        status: (m.is_active ? m.current_status : "pending") as MonitorStatus,
        paused: !m.is_active,
        history: fillDays(daily, 90),
        uptime: summarize(daily, 90).uptime,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const live = services.filter((s) => !s.paused && s.status !== "pending");
  const down = live.filter((s) => s.status === "down").length;
  const overall =
    live.length === 0
      ? { label: "No data yet", status: "pending" as MonitorStatus }
      : down === 0
        ? { label: "All systems operational", status: "up" as MonitorStatus }
        : down === live.length
          ? { label: "Major outage", status: "down" as MonitorStatus }
          : { label: "Partial outage", status: "down" as MonitorStatus };

  const nameOf = new Map(services.map((s) => [s.id, s.name]));
  const updated = new Date();

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
      <AutoRefresh seconds={60} />

      <header className="flex items-center justify-between py-6">
        <div className="flex min-w-0 items-center gap-3">
          <LogoMark size={28} />
          <span className="truncate text-[15px] font-black tracking-tight text-ink">{page.title}</span>
        </div>
        <span className="hud hidden sm:inline">Status // Live</span>
      </header>

      {page.description && <p className="mb-6 mt-4 text-muted">{page.description}</p>}

      <section
        className={`glass mb-8 mt-4 flex items-center gap-4 p-5 sm:p-6 ${
          overall.status === "down" ? "shadow-[0_0_48px_-12px_rgb(196_181_253/0.45)]" : ""
        }`}
      >
        <StatusDot status={overall.status} size={12} />
        <div className="min-w-0">
          <h1 className="text-xl font-black tracking-tight text-ink sm:text-2xl">{overall.label}</h1>
          <p className="hud mt-1">Updated {fmtDate(updated.toISOString())} · refreshes every minute</p>
        </div>
      </section>

      <section className="glass mb-8 divide-y divide-line/70 overflow-hidden">
        {services.length === 0 ? (
          <p className="p-6 text-sm text-muted">No services on this page yet.</p>
        ) : (
          services.map((s) => (
            <article key={s.id} className="p-5 sm:p-6">
              <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="truncate font-bold text-ink">{s.name}</h2>
                <span className="inline-flex shrink-0 items-center gap-2">
                  <StatusDot status={s.status} size={8} />
                  <span
                    className={`font-mono text-[11px] uppercase tracking-[0.16em] ${
                      s.status === "down" ? "text-ink" : s.status === "up" ? "text-body" : "text-dim"
                    }`}
                  >
                    {s.paused ? "Paused" : s.status === "up" ? "Operational" : s.status === "down" ? "Outage" : "No data"}
                  </span>
                </span>
              </div>
              <UptimeBar days={s.history} mobileDays={30} />
              <div className="hud mt-2 flex justify-between gap-2">
                <span>
                  <span className="sm:hidden">30 days ago</span>
                  <span className="hidden sm:inline">90 days ago</span>
                </span>
                <span>{s.uptime === null ? "—" : `${s.uptime.toFixed(2)}% uptime`}</span>
                <span>Today</span>
              </div>
            </article>
          ))
        )}
      </section>

      <section>
        <h2 className="hud mb-4">Incidents // last 30 days</h2>
        {(incidents ?? []).length === 0 ? (
          <div className="glass p-5 text-sm text-muted sm:p-6">No incidents in the last 30 days.</div>
        ) : (
          <ol className="glass divide-y divide-line/70 overflow-hidden">
            {(incidents ?? []).map((i) => {
              const open = !i.resolved_at;
              const dur = new Date(i.resolved_at ?? Date.now()).getTime() - new Date(i.started_at).getTime();
              return (
                <li key={i.id} className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-ink">
                      {nameOf.get(i.monitor_id) ?? "Service"} — {open ? "outage in progress" : "outage resolved"}
                    </p>
                    <span className="font-mono text-xs text-muted">{fmtDuration(dur)}</span>
                  </div>
                  <p className="hud mt-1">
                    {fmtDate(i.started_at)}
                    {i.resolved_at ? ` → ${fmtDate(i.resolved_at)}` : " → ongoing"}
                  </p>
                  {i.notes && <p className="mt-2 text-sm text-body">{i.notes}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        <span className="hud">Powered by NEONDEV Pulse</span>
        <a href="/" className="hud transition-colors hover:text-ink">
          Monitor your own sites →
        </a>
      </footer>
    </main>
  );
}
