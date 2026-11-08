export type MonitorStatus = "up" | "down" | "pending";

export interface Monitor {
  id: string;
  name: string;
  url: string;
  interval_minutes: number;
  current_status: MonitorStatus;
  last_checked_at: string | null;
  is_active: boolean;
}

export interface Check {
  id: number;
  monitor_id: string;
  checked_at: string;
  status: "up" | "down";
  status_code: number | null;
  response_time_ms: number | null;
  error: string | null;
}

export interface Incident {
  id: string;
  monitor_id: string;
  started_at: string;
  resolved_at: string | null;
  cause: string | null;
  notes: string | null;
}

export interface DayUptime {
  day: string; // YYYY-MM-DD
  pct: number | null; // null = no data that day
}
