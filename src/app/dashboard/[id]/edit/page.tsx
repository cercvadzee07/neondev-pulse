import { supabaseConfigured } from "@/components/SetupNotice";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/DeleteButton";
import { MonitorForm } from "@/components/MonitorForm";
import { createClient } from "@/lib/supabase/server";
import { deleteMonitor, toggleMonitor, updateMonitor } from "../../actions";

export const metadata = { title: "Edit monitor — NEONDEV Pulse" };

export default async function EditMonitorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const { data: m } = await supabase
    .from("monitors")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!m) notFound();

  return (
    <main className="mx-auto mt-6 max-w-xl space-y-6">
      <div>
        <p className="hud mb-3">Monitors // Edit</p>
        <h1 className="display text-4xl">{m.name}</h1>
      </div>

      <div className="glass p-6 sm:p-8">
        <MonitorForm action={updateMonitor.bind(null, m.id)} initial={m} submitLabel="Save changes" />
      </div>

      <div className="glass space-y-5 p-6 sm:p-8">
        <p className="hud">Controls</p>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-ink">{m.is_active ? "Pause monitoring" : "Resume monitoring"}</p>
            <p className="text-sm text-muted">
              {m.is_active ? "Stop checks without losing history." : "Checks are paused. History is kept."}
            </p>
          </div>
          <form action={toggleMonitor}>
            <input type="hidden" name="id" value={m.id} />
            <input type="hidden" name="active" value={String(!m.is_active)} />
            <button
              type="submit"
              className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-neon-indigo/60"
            >
              {m.is_active ? "Pause" : "Resume"}
            </button>
          </form>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
          <div>
            <p className="font-semibold text-ink">Delete monitor</p>
            <p className="text-sm text-muted">Removes all checks and incidents. Can&apos;t be undone.</p>
          </div>
          <form action={deleteMonitor}>
            <input type="hidden" name="id" value={m.id} />
            <DeleteButton name={m.name} />
          </form>
        </div>
      </div>
    </main>
  );
}
