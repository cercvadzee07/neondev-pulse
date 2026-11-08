import { supabaseConfigured } from "@/components/SetupNotice";
import { StatusPageForm, type MonitorOption } from "@/components/StatusPageForm";
import { createClient } from "@/lib/supabase/server";
import { createStatusPage } from "../actions";

export const metadata = { title: "New status page — NEONDEV Pulse" };

export default async function NewStatusPage() {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("monitors").select("id, name, url").order("created_at");

  return (
    <main className="mx-auto mt-6 max-w-2xl">
      <p className="hud mb-3">Status pages // New</p>
      <h1 className="display mb-8 text-4xl">New status page</h1>
      <div className="glass p-6 sm:p-8">
        <StatusPageForm action={createStatusPage} monitors={(data ?? []) as MonitorOption[]} submitLabel="Create page" />
      </div>
    </main>
  );
}
