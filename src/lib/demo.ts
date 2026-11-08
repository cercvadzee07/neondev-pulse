import type { DayUptime, Monitor } from "./types";

/**
 * Demo data so the UI renders before Supabase is connected.
 * Replaced by real queries in Phase 2.
 */

// Small deterministic PRNG so server and client render the same bars.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export interface DemoMonitor extends Monitor {
  uptime30d: number;
  avgMs: number;
  history: DayUptime[];
  latency: number[];
}

function makeHistory(seed: number, days = 90): DayUptime[] {
  const r = rng(seed);
  const today = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - (days - 1 - i));
    const roll = r();
    const pct = roll > 0.97 ? 94 + r() * 4 : roll > 0.9 ? 98.5 + r() * 1.3 : 100;
    return { day: d.toISOString().slice(0, 10), pct };
  });
}

function makeLatency(seed: number, base: number, n = 32): number[] {
  const r = rng(seed);
  return Array.from({ length: n }, () => Math.round(base * (0.8 + r() * 0.5)));
}

const base: Array<Pick<Monitor, "id" | "name" | "url" | "current_status"> & { seed: number; ms: number }> = [
  { id: "m1", name: "Portfolio", url: "https://neondev.example.com", current_status: "up", seed: 11, ms: 142 },
  { id: "m2", name: "Client Shop", url: "https://shop.example.com", current_status: "up", seed: 23, ms: 318 },
  { id: "m3", name: "Public API", url: "https://api.example.com/health", current_status: "down", seed: 37, ms: 96 },
  { id: "m4", name: "Docs", url: "https://docs.example.com", current_status: "up", seed: 41, ms: 205 },
];

export const demoMonitors: DemoMonitor[] = base.map((m) => {
  const history = makeHistory(m.seed);
  const last30 = history.slice(-30).map((d) => d.pct ?? 100);
  return {
    id: m.id,
    name: m.name,
    url: m.url,
    interval_minutes: 5,
    current_status: m.current_status,
    last_checked_at: null,
    is_active: true,
    uptime30d: last30.reduce((a, b) => a + b, 0) / last30.length,
    avgMs: m.ms,
    history,
    latency: makeLatency(m.seed, m.ms),
  };
});
