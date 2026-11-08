import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transition } from "./checker";

const RESEND_URL = "https://api.resend.com/emails";

export interface AlertResult {
  monitor: string;
  to: string | null;
  sent: boolean;
  reason?: string;
}

function fmtDuration(ms: number) {
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return h < 48 ? `${h}h ${m % 60}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

/** NEONDEV-styled email. Table layout + inline styles for email clients. */
function render(t: Transition, siteUrl: string) {
  const down = t.to === "down";
  const name = esc(t.monitor.name);
  const subject = down
    ? `🔴 ${t.monitor.name} is down`
    : `🟢 ${t.monitor.name} is back up${t.downtimeMs ? ` (down ${fmtDuration(t.downtimeMs)})` : ""}`;
  const when = new Date(t.at).toUTCString();
  const link = `${siteUrl}/dashboard/${t.monitor.id}`;
  const dot = down
    ? `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;border:2px solid #c4b5fd"></span>`
    : `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#a3e635"></span>`;
  const rows = [
    ["URL", `<a href="${esc(t.monitor.url)}" style="color:#a5b4fc">${esc(t.monitor.url)}</a>`],
    [down ? "Detected" : "Recovered", esc(when)],
    ...(down && t.error ? [["Cause", esc(t.error)]] : []),
    ...(!down && t.downtimeMs ? [["Downtime", fmtDuration(t.downtimeMs)]] : []),
  ];

  const html = `<!doctype html><html><body style="margin:0;background:#080a12;padding:32px 16px;font-family:Inter,Segoe UI,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#11131c;border:1px solid #2a3045;border-radius:16px">
<tr><td style="padding:28px 28px 8px">
  <p style="margin:0 0 20px;font:600 11px/1 'JetBrains Mono',Consolas,monospace;letter-spacing:.18em;text-transform:uppercase;color:#525a6e">NEONDEV // PULSE</p>
  <p style="margin:0 0 10px;font:600 11px/1 'JetBrains Mono',Consolas,monospace;letter-spacing:.16em;text-transform:uppercase;color:#c9d1e4">${dot}&nbsp;&nbsp;${down ? "Down" : "Operational"}</p>
  <h1 style="margin:0 0 8px;font:900 28px/1.1 Inter,Arial,sans-serif;letter-spacing:-.03em;color:#ffffff">${name} ${down ? "is down" : "is back up"}</h1>
  <p style="margin:0 0 20px;font:500 15px/1.5 Inter,Arial,sans-serif;color:#8a93a8">${down ? "Pulse couldn't reach your site after a retry." : "Your site is responding normally again."}</p>
</td></tr>
<tr><td style="padding:0 28px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #2a3045">
  ${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #2a3045;font:600 11px/1.4 'JetBrains Mono',Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;color:#525a6e;width:110px">${k}</td><td style="padding:10px 0;border-bottom:1px solid #2a3045;font:500 14px/1.4 Inter,Arial,sans-serif;color:#c9d1e4">${v}</td></tr>`,
    )
    .join("")}
  </table>
</td></tr>
<tr><td style="padding:24px 28px 28px">
  <a href="${link}" style="display:inline-block;background:#a3e635;color:#080a12;font:700 14px/1 Inter,Arial,sans-serif;padding:12px 20px;border-radius:8px;text-decoration:none">View monitor</a>
</td></tr>
</table>
<p style="margin:20px 0 0;font:500 11px/1 'JetBrains Mono',Consolas,monospace;letter-spacing:.16em;text-transform:uppercase;color:#525a6e">● Build · Ship · Repeat</p>
</td></tr></table></body></html>`;

  const text = `${subject}\n\nURL: ${t.monitor.url}\n${down ? "Detected" : "Recovered"}: ${when}\n${
    down && t.error ? `Cause: ${t.error}\n` : ""
  }${!down && t.downtimeMs ? `Downtime: ${fmtDuration(t.downtimeMs)}\n` : ""}\nView monitor: ${link}\n`;

  return { subject, html, text };
}

/**
 * Email the monitor owner for each up/down transition.
 * Never throws — a failed alert must not break the check run.
 */
export async function sendAlerts(admin: SupabaseClient, transitions: Transition[]): Promise<AlertResult[]> {
  if (!transitions.length) return [];

  const key = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL || "NEONDEV Pulse <onboarding@resend.dev>";
  const override = process.env.ALERT_TEST_TO; // dev: send every alert here
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

  const emailCache = new Map<string, string | null>();
  const ownerEmail = async (userId: string) => {
    if (!emailCache.has(userId)) {
      const { data } = await admin.auth.admin.getUserById(userId);
      emailCache.set(userId, data.user?.email ?? null);
    }
    return emailCache.get(userId)!;
  };

  const results: AlertResult[] = [];
  for (const t of transitions) {
    if (t.monitor.notify_email === false) {
      results.push({ monitor: t.monitor.name, to: null, sent: false, reason: "alerts off" });
      continue;
    }
    const to = override || (await ownerEmail(t.monitor.user_id));
    if (!key || !to) {
      results.push({ monitor: t.monitor.name, to, sent: false, reason: key ? "no recipient" : "RESEND_API_KEY not set" });
      continue;
    }
    try {
      const { subject, html, text } = render(t, siteUrl);
      const res = await fetch(RESEND_URL, {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, html, text }),
      });
      if (res.ok) results.push({ monitor: t.monitor.name, to, sent: true });
      else results.push({ monitor: t.monitor.name, to, sent: false, reason: `Resend ${res.status}: ${await res.text()}` });
    } catch (e) {
      results.push({ monitor: t.monitor.name, to, sent: false, reason: (e as Error).message });
    }
  }

  for (const r of results) {
    if (r.sent) console.info(`[alerts] sent "${r.monitor}" → ${r.to}`);
    else console.warn(`[alerts] skipped "${r.monitor}": ${r.reason}`);
  }
  return results;
}
