import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Dev-only: what can an anonymous visitor read? URLs must be blocked; public data must be readable. */
export async function GET() {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: true });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const anonGet = async (path: string) => {
    const r = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: anon, authorization: `Bearer ${anon}` },
      cache: "no-store",
    });
    const body = await r.text();
    return r.ok ? `ok (${(JSON.parse(body) as unknown[]).length} rows)` : `${r.status}: ${body.slice(0, 200)}`;
  };

  return NextResponse.json({
    shouldBeBlocked_monitorUrls: await anonGet("monitors?select=url&limit=5"),
    shouldBeOk_monitors: await anonGet("monitors?select=id,name,current_status&limit=5"),
    shouldBeOk_checks: await anonGet("checks?select=id,monitor_id,checked_at,status&limit=5"),
    shouldBeOk_incidents: await anonGet("incidents?select=id,monitor_id,started_at&limit=5"),
  });
}
