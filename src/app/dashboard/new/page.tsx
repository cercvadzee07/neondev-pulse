import { MonitorForm } from "@/components/MonitorForm";
import { createMonitor } from "../actions";

export const metadata = { title: "Add monitor — NEONDEV Pulse" };

export default function NewMonitorPage() {
  return (
    <main className="mx-auto mt-6 max-w-xl">
      <p className="hud mb-3">Monitors // New</p>
      <h1 className="display mb-8 text-4xl">Add a monitor</h1>
      <div className="glass p-6 sm:p-8">
        <MonitorForm action={createMonitor} submitLabel="Create monitor" />
      </div>
    </main>
  );
}
