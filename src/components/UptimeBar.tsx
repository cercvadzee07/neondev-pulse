import type { DayUptime } from "@/lib/types";

function barClass(pct: number | null) {
  if (pct === null) return "bg-line/60";
  if (pct >= 99.9) return "bg-lime/75";
  if (pct >= 98) return "bg-neon-indigo/80";
  return "bg-neon-lavender";
}

/** 90-day (or N-day) uptime strip, one bar per day. */
export function UptimeBar({ days }: { days: DayUptime[] }) {
  return (
    <div className="flex h-8 items-stretch gap-[2px]" role="list" aria-label="Daily uptime history">
      {days.map((d) => (
        <span
          key={d.day}
          role="listitem"
          title={`${d.day} — ${d.pct === null ? "no data" : `${d.pct.toFixed(2)}% uptime`}`}
          className={`min-w-[2px] flex-1 rounded-[2px] transition-opacity hover:opacity-60 ${barClass(d.pct)}`}
        />
      ))}
    </div>
  );
}
