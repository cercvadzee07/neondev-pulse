import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Dev-only: checks that the server can reach Supabase. Never returns key values. */
export async function GET() {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: true });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const cron = process.env.CRON_SECRET ?? "";

  const env = {
    url: url ? JSON.stringify(url) : "MISSING",
    urlLooksValid: /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url),
    anonKey: anon ? `${anon.slice(0, 15)}… (${anon.length} chars)` : "MISSING",
    secretKey: secret ? `${secret.slice(0, 10)}… (${secret.length} chars)` : "MISSING",
    cronSecret: cron ? `${cron.slice(0, 4)}… (${cron.length} chars)` : "MISSING",
    resendKey: process.env.RESEND_API_KEY ? `${process.env.RESEND_API_KEY.slice(0, 3)}… (${process.env.RESEND_API_KEY.length} chars)` : "MISSING",
    alertFrom: process.env.ALERT_FROM_EMAIL || "(default) onboarding@resend.dev",
    alertTestTo: process.env.ALERT_TEST_TO ? "set" : "not set",
  };

  try {
    const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anon }, cache: "no-store" });

    // Privacy: can an anonymous visitor read monitored URLs? Must be "blocked".
    const anonRead = await fetch(`${url}/rest/v1/monitors?select=url&limit=1`, {
      headers: { apikey: anon, authorization: `Bearer ${anon}` },
      cache: "no-store",
    });
    const privacy = {
      anonCanReadMonitorUrls: anonRead.ok ? ((await anonRead.json()) as unknown[]).length > 0 : false,
      status: anonRead.ok ? "EXPOSED or no public monitors" : `blocked (${anonRead.status})`,
    };

    return NextResponse.json({ env, privacy, reach: { ok: res.ok, status: res.status, body: await res.text() } });
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string; hostname?: string } };
    return NextResponse.json({
      env,
      reach: { ok: false, error: err.message, cause: err.cause?.code ?? err.cause?.message ?? null },
    });
  }
}
