import type { MonitorStatus } from "@/lib/types";

const LABEL: Record<MonitorStatus, string> = {
  up: "Operational",
  down: "Down",
  pending: "Pending",
};

/**
 * Status signal. Strictly on-palette:
 *  up      → pulsing lime dot (the one "online" signal)
 *  down    → lavender ring with a slash, label in white
 *  pending → dim hollow dot
 */
export function StatusDot({ status, size = 10 }: { status: MonitorStatus; size?: number }) {
  if (status === "up") {
    return (
      <span
        role="img"
        aria-label={LABEL.up}
        className="inline-block shrink-0 rounded-full bg-lime animate-pulse-dot"
        style={{ width: size, height: size }}
      />
    );
  }
  if (status === "down") {
    return (
      <span
        role="img"
        aria-label={LABEL.down}
        className="relative inline-block shrink-0 rounded-full border-2 border-neon-lavender"
        style={{ width: size + 2, height: size + 2 }}
      >
        <span className="absolute left-1/2 top-1/2 h-[2px] w-[140%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-neon-lavender" />
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label={LABEL.pending}
      className="inline-block shrink-0 rounded-full border border-dim"
      style={{ width: size, height: size }}
    />
  );
}

export function StatusLabel({ status }: { status: MonitorStatus }) {
  return (
    <span className="inline-flex items-center gap-2">
      <StatusDot status={status} />
      <span
        className={`font-mono text-[11px] uppercase tracking-[0.16em] ${
          status === "down" ? "text-ink" : status === "up" ? "text-body" : "text-dim"
        }`}
      >
        {LABEL[status]}
      </span>
    </span>
  );
}
