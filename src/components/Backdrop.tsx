/** Fixed background: faint grid, vignette, violet corner glow, code texture. */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* grid */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(42 48 69 / 0.35) 1px, transparent 1px), linear-gradient(90deg, rgb(42 48 69 / 0.35) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%)",
        }}
      />
      {/* violet glow, top-right */}
      <div className="absolute -top-48 -right-48 h-[640px] w-[640px] rounded-full bg-neon-lavender/10 blur-[140px]" />
      {/* faint code texture */}
      <pre className="absolute bottom-10 left-8 hidden font-mono text-[11px] leading-5 text-dim/25 lg:block">
{`const res = await fetch(monitor.url, { signal });
const ms = performance.now() - t0;
if (!res.ok) openIncident(monitor, res.status);
await db.checks.insert({ status: "up", ms });`}
      </pre>
      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(8_10_18/0.85)_100%)]" />
    </div>
  );
}
