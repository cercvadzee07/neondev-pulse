import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/DeleteButton";
import { supabaseConfigured } from "@/components/SetupNotice";
import { StatusPageForm, type MonitorOption } from "@/components/StatusPageForm";
import { createClient } from "@/lib/supabase/server";
import { deleteStatusPage, updateStatusPage } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit status page — NEONDEV Pulse" };

export default async function EditStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  if (!supabaseConfigured) return null;
  const supabase = await createClient();

  const [{ data: page }, { data: monitors }, { data: links }] = await Promise.all([
    supabase.from("status_pages").select("id, title, slug, description, is_public").eq("id", id).maybeSingle(),
    supabase.from("monitors").select("id, name, url").order("created_at"),
    supabase
      .from("status_page_monitors")
      .select("monitor_id, display_name, sort_order")
      .eq("status_page_id", id)
      .order("sort_order"),
  ]);
  if (!page) notFound();

  const initial = {
    ...page,
    monitors: (links ?? []).map((l) => ({ id: l.monitor_id as string, display_name: l.display_name as string | null })),
  };

  return (
    <main className="mx-auto mt-6 max-w-2xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hud mb-3">Status pages // Edit</p>
          <h1 className="display text-4xl">{page.title}</h1>
        </div>
        {page.is_public && (
          <a
            href={`/status/${page.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-neon-indigo/60"
          >
            View public page ↗
          </a>
        )}
      </div>

      {created && (
        <p role="status" className="glass flex items-center gap-3 px-5 py-4 text-sm text-body">
          <span className="inline-block size-2 rounded-full bg-lime" />
          Page created. Share <span className="font-mono text-ink">/status/{page.slug}</span> with anyone.
        </p>
      )}

      <div className="glass p-6 sm:p-8">
        <StatusPageForm
          action={updateStatusPage.bind(null, page.id)}
          monitors={(monitors ?? []) as MonitorOption[]}
          initial={initial}
          submitLabel="Save changes"
        />
      </div>

      <div className="glass flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
        <div>
          <p className="font-semibold text-ink">Delete status page</p>
          <p className="text-sm text-muted">The public link stops working. Monitors are not affected.</p>
        </div>
        <form action={deleteStatusPage}>
          <input type="hidden" name="id" value={page.id} />
          <DeleteButton name={page.title} />
        </form>
      </div>
    </main>
  );
}
