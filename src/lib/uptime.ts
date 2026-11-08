import type { DayUptime } from "./types";

export interface DailyRow {
  day: string;
  uptime_pct: number | string;
  avg_ms: number | string | null;
  checks: number;
}

/** Turn sparse daily rows into a continuous N-day series (missing days = null). */
export function fillDays(rows: DailyRow[], days: number): DayUptime[] {
  const map = new Map(rows.map((r) => [String(r.day).slice(0, 10), Number(r.uptime_pct)]));
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (days - 1 - i)));
    const key = d.toISOString().slice(0, 10);
    return { day: key, pct: map.has(key) ? map.get(key)! : null };
  });
}

/** Check-weighted uptime % and average latency over the last N days. */
export function summarize(rows: DailyRow[], days: number) {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const recent = rows.filter((r) => String(r.day).slice(0, 10) > cutoff);
  const total = recent.reduce((a, r) => a + r.checks, 0);
  if (!total) return { uptime: null as number | null, avgMs: null as number | null };
  const up = recent.reduce((a, r) => a + (Number(r.uptime_pct) / 100) * r.checks, 0);
  const msRows = recent.filter((r) => r.avg_ms != null);
  const avgMs = msRows.length
    ? Math.round(msRows.reduce((a, r) => a + Number(r.avg_ms) * r.checks, 0) / msRows.reduce((a, r) => a + r.checks, 0))
    : null;
  return { uptime: (up / total) * 100, avgMs };
}

export function timeAgo(iso: string | null) {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
