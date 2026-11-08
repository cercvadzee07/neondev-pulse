import Link from "next/link";
import { Logo } from "@/components/Logo";
import { StatusDot, StatusLabel } from "@/components/StatusDot";
import { UptimeBar } from "@/components/UptimeBar";
import { demoMonitors } from "@/lib/demo";

const features = [
  { tag: "01 // CHECKS", title: "Every 5 minutes", body: "HTTP checks with status code, response time and timeout tracking." },
  { tag: "02 // ALERTS", title: "Down & recovered", body: "Email the moment a site fails — and again when it's back, with downtime." },
  { tag: "03 // STATUS", title: "Public status pages", body: "A shareable page with live status, 90-day history and incident notes." },
  { tag: "04 // HISTORY", title: "Uptime you can prove", body: "24h, 7d and 30d uptime, latency charts and a full incident timeline." },
];

export default function Home() {
  const preview = demoMonitors;
  const allUp = preview.every((m) => m.current_status === "up");

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* nav */}
      <header className="flex items-center justify-between py-6">
        <Logo />
        <nav className="flex items-center gap-2 sm:gap-6">
          <Link href="/dashboard" className="hud hidden text-muted! transition-colors hover:text-ink! sm:inline">
            Dashboard
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-neon-indigo/60"
          >
            Open app
          </Link>
        </nav>
      </header>

      {/* hero */}
      <section className="grid items-center gap-12 pb-24 pt-16 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
        <div className="animate-rise">
          <p className="hud mb-6 flex items-center gap-2">
            <StatusDot status="up" size={8} /> NEONDEV // SYS.ONLINE
          </p>
          <h1 className="display text-5xl sm:text-6xl lg:text-7xl">
            Know it&apos;s down
            <br />
            <span className="text-gradient">before they do.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-body">
            Uptime checks, instant alerts and public status pages. Built for developers who ship.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-lg bg-lime px-6 py-3 text-sm font-bold text-bg transition-transform hover:-translate-y-0.5"
            >
              Start monitoring
            </Link>
            <Link href="/dashboard" className="hud text-muted! transition-colors hover:text-ink!">
              View live demo →
            </Link>
          </div>
        </div>

        {/* status preview panel */}
        <div className="glass animate-rise p-5 sm:p-6 [animation-delay:120ms]">
          <div className="mb-5 flex items-center justify-between">
            <span className="hud">status.neondev // live</span>
            <span className="hud text-muted!">90D</span>
          </div>
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-line bg-bg/60 px-4 py-3">
            <StatusDot status={allUp ? "up" : "down"} />
            <span className="font-semibold text-ink">
              {allUp ? "All systems operational" : "Partial outage"}
            </span>
          </div>
          <ul className="space-y-5">
            {preview.map((m) => (
              <li key={m.id}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <span className="truncate text-sm font-semibold text-ink">{m.name}</span>
                  <StatusLabel status={m.current_status} />
                </div>
                <UptimeBar days={m.history.slice(-60)} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* features */}
      <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <article key={f.tag} className="glass p-6">
            <p className="hud mb-6">{f.tag}</p>
            <h2 className="mb-2 text-lg font-extrabold tracking-tight text-ink">{f.title}</h2>
            <p className="text-sm leading-relaxed text-muted">{f.body}</p>
          </article>
        ))}
      </section>

      <footer className="flex flex-col items-start justify-between gap-3 border-t border-line py-8 sm:flex-row sm:items-center">
        <span className="hud">● Build · Ship · Repeat</span>
        <span className="hud">neondev.code@gmail.com</span>
      </footer>
    </main>
  );
}
