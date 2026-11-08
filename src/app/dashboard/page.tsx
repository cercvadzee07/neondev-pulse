import { Logo } from "@/components/Logo";
import { Sparkline } from "@/components/Sparkline";
import { StatusLabel } from "@/components/StatusDot";
import { UptimeBar } from "@/components/UptimeBar";
import { demoMonitors } from "@/lib/demo";

export const metadata = { title: "Dashboard — NEONDEV Pulse" };

export default function Dashboard() {
  const monitors = demoMonitors;
  const up = monitors.filter((m) => m.current_status === "up").length;
  const avgUptime = monitors.reduce((a, m) => a + m.uptime30d, 0) / monitors.length;
  const avgMs = Math.round(monitors.reduce((a, m) => a + m.avgMs, 0) / monitors.length);

  const stats = [
    { label: "Monitors up", value: `${up}/${monitors.length}` },
    { label: "Uptime · 30d", value: `${avgUptime.toFixed(2)}%` },
    { label: "Avg response", value: `${avgMs} ms` },
    { label: "Check interval", value: "5 min" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <header className="flex items-center justify-between py-6">
        <Logo />
        <span className="hud">Demo data // Phase 1</span>
      </header>

      <div className="mb-8 mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hud mb-3">Overview</p>
          <h1 className="display text-4xl sm:text-5xl">Monitors</h1>
        </div>
        <button
          type="button"
          disabled
          className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted"
          title="Coming in Phase 2"
        >
          + Add monitor
        </button>
      </div>

      {/* stat tiles */}
      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass p-5">
            <p className="hud mb-3">{s.label}</p>
            <p className="text-2xl font-black tracking-tight text-ink sm:text-3xl">{s.value}</p>
          </div>
        ))}
      </section>

      {/* monitor list */}
      <section className="glass divide-y divide-line/70 overflow-hidden">
        {monitors.map((m) => (
          <article key={m.id} className="grid gap-4 p-5 sm:p-6 md:grid-cols-[1.2fr_1fr_auto] md:items-center">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-3">
                <h2 className="truncate text-base font-extrabold text-ink">{m.name}</h2>
              </div>
              <p className="truncate font-mono text-xs text-dim">{m.url}</p>
              <div className="mt-3">
                <StatusLabel status={m.current_status} />
              </div>
            </div>
            <div className="min-w-0">
              <UptimeBar days={m.history.slice(-45)} />
              <p className="hud mt-2">
                {m.uptime30d.toFixed(2)}% · 30d
              </p>
            </div>
            <div className="flex items-center gap-4 md:flex-col md:items-end">
              <Sparkline values={m.latency} width={120} />
              <span className="font-mono text-sm text-body">{m.avgMs} ms</span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
