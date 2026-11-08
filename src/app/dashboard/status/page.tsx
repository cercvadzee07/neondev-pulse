import Link from "next/link";
import { supabaseConfigured } from "@/components/SetupNotice";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Status pages — NEONDEV Pulse" };

export default async function StatusPagesList() {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("status_pages")
    .select("id, title, slug, is_public, status_page_monitors(count)")
    .order("created_at", { ascending: true });
  const pages = data ?? [];

  return (
    <main>
      <div className="mb-8 mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hud mb-3">Share</p>
          <h1 className="display text-4xl sm:text-5xl">Status pages</h1>
        </div>
        <Link
          href="/dashboard/status/new"
          className="rounded-lg bg-lime px-4 py-2.5 text-sm font-bold text-bg transition-transform hover:-translate-y-0.5"
        >
          + New status page
        </Link>
      </div>

      {pages.length === 0 ? (
        <section className="glass flex flex-col items-center px-6 py-16 text-center">
          <p className="hud mb-4">No status pages yet</p>
          <h2 className="mb-3 text-2xl font-black tracking-tight text-ink">Show the world you&apos;re up</h2>
          <p className="mb-8 max-w-sm text-sm text-muted">
            A public page with live status, 90-day uptime and incident history. Visitors never see your URLs.
          </p>
          <Link href="/dashboard/status/new" className="rounded-lg bg-lime px-5 py-2.5 text-sm font-bold text-bg">
            + New status page
          </Link>
        </section>
      ) : (
        <section className="glass divide-y divide-line/70 overflow-hidden">
          {pages.map((p) => {
            const count = (p.status_page_monitors as unknown as { count: number }[])?.[0]?.count ?? 0;
            return (
              <article key={p.id} className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-extrabold text-ink">{p.title}</h2>
                  <p className="hud mt-1">
                    /status/{p.slug} · {count} monitor{count === 1 ? "" : "s"} · {p.is_public ? "Published" : "Hidden"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {p.is_public && (
                    <a
                      href={`/status/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-neon-indigo/60"
                    >
                      View ↗
                    </a>
                  )}
                  <Link
                    href={`/dashboard/status/${p.id}`}
                    className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-neon-indigo/60 hover:text-ink"
                  >
                    Edit
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
