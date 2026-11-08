"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { MonitorFormState } from "@/app/dashboard/actions";
import { fieldErrorClass, inputClass, labelClass } from "./form-styles";

interface Initial {
  name?: string;
  url?: string;
  interval_minutes?: number;
  expected_status?: number;
  notify_email?: boolean;
}

export function MonitorForm({
  action,
  initial = {},
  submitLabel,
}: {
  action: (prev: MonitorFormState, formData: FormData) => Promise<MonitorFormState>;
  initial?: Initial;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const fe = state?.fieldErrors ?? {};
  const v = state?.values;
  const val = {
    name: v?.name ?? initial.name,
    url: v?.url ?? initial.url,
    interval_minutes: v ? Number(v.interval_minutes) : (initial.interval_minutes ?? 5),
    expected_status: v?.expected_status ?? initial.expected_status ?? 200,
    notify_email: v ? v.notify_email === "on" : (initial.notify_email ?? true),
  };
  // Remount inputs with the echoed values after each submit (React 19 resets forms).
  const formKey = v ? JSON.stringify(v) : "initial";

  return (
    <form key={formKey} action={formAction} className="space-y-6" noValidate>
      <label className="block">
        <span className={labelClass}>Name</span>
        <input name="name" defaultValue={val.name} placeholder="My website" className={inputClass} required />
        {fe.name && <span className={fieldErrorClass}>{fe.name}</span>}
      </label>

      <label className="block">
        <span className={labelClass}>URL</span>
        <input
          name="url"
          type="url"
          inputMode="url"
          defaultValue={val.url}
          placeholder="https://example.com"
          className={`${inputClass} font-mono text-sm`}
          required
        />
        {fe.url && <span className={fieldErrorClass}>{fe.url}</span>}
      </label>

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Check every</span>
          <select name="interval_minutes" defaultValue={val.interval_minutes} className={inputClass}>
            {[5, 10, 15, 30, 60].map((n) => (
              <option key={n} value={n}>
                {n} minutes
              </option>
            ))}
          </select>
          {fe.interval_minutes && <span className={fieldErrorClass}>{fe.interval_minutes}</span>}
        </label>

        <label className="block">
          <span className={labelClass}>Expected status</span>
          <input
            name="expected_status"
            type="number"
            min={100}
            max={599}
            defaultValue={val.expected_status}
            className={`${inputClass} font-mono text-sm`}
          />
          {fe.expected_status && <span className={fieldErrorClass}>{fe.expected_status}</span>}
        </label>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-bg/40 px-4 py-3">
        <input
          type="checkbox"
          name="notify_email"
          defaultChecked={val.notify_email}
          className="mt-0.5 size-4 accent-[#a3e635]"
        />
        <span>
          <span className="block text-sm font-semibold text-ink">Email alerts</span>
          <span className="block text-sm text-muted">Email me when this site goes down and when it recovers.</span>
        </span>
      </label>

      {state?.error && (
        <p role="alert" className="rounded-lg border border-neon-lavender/40 px-3 py-2 text-sm text-ink">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-lime px-5 py-2.5 text-sm font-bold text-bg transition-opacity disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href="/dashboard" className="hud transition-colors hover:text-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}
