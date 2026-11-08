import { NextResponse, type NextRequest } from "next/server";
import { sendAlerts } from "@/lib/alerts";
import { runChecks } from "@/lib/checker";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Called every 5 minutes by GitHub Actions (.github/workflows/uptime-checks.yml).
 * Auth: `Authorization: Bearer <CRON_SECRET>`.
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // Refuse to run with a missing or placeholder secret.
  if (!secret || secret.length < 24 || secret.startsWith("generate-")) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  try {
    const summary = await runChecks(admin);
    const alerts = await sendAlerts(admin, summary.transitions);

    // Daily housekeeping: keep 90 days of raw checks.
    const now = new Date();
    if (now.getUTCHours() === 3 && now.getUTCMinutes() < 5) await admin.rpc("prune_old_checks");

    return NextResponse.json({
      ok: true,
      checked: summary.checked,
      up: summary.up,
      down: summary.down,
      transitions: summary.transitions.map((t) => ({ monitor: t.monitor.name, to: t.to })),
      alertsSent: alerts.filter((a) => a.sent).length,
      durationMs: summary.durationMs,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
