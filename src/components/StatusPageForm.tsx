"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { StatusPageFormState } from "@/app/dashboard/status/actions";
import { fieldErrorClass, inputClass, labelClass } from "./form-styles";

export interface MonitorOption {
  id: string;
  name: string;
  url: string;
}

interface Initial {
  title?: string;
  slug?: string;
  description?: string | null;
  is_public?: boolean;
  monitors?: { id: string; display_name: string | null }[];
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

export function StatusPageForm({
  action,
  monitors,
  initial = {},
  submitLabel,
}: {
  action: (prev: StatusPageFormState, formData: FormData) => Promise<StatusPageFormState>;
  monitors: MonitorOption[];
  initial?: Initial;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const fe = state?.fieldErrors ?? {};
  const v = state?.values;

  const initialSelected = v?.monitors ?? initial.monitors?.map((m) => m.id) ?? [];
  const names = Object.fromEntries((initial.monitors ?? []).map((m) => [m.id, m.display_name ?? ""]));

  const [slug, setSlug] = useState(v?.slug ?? initial.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));
  const formKey = v ? JSON.stringify(v) : "initial";

  return (
    <form key={formKey} action={formAction} className="space-y-6" noValidate>
      <label className="block">
        <span className={labelClass}>Title</span>
        <input
          name="title"
          defaultValue={v?.title ?? initial.title}
          placeholder="NEONDEV Status"
          className={inputClass}
          onChange={(e) => !slugTouched && setSlug(slugify(e.target.value))}
          required
        />
        {fe.title && <span className={fieldErrorClass}>{fe.title}</span>}
      </label>

      <label className="block">
        <span className={labelClass}>Public address</span>
        <div className="flex items-stretch overflow-hidden rounded-lg border border-line bg-bg/70 focus-within:border-neon-indigo/70">
          <span className="flex items-center border-r border-line px-3 font-mono text-xs text-dim">/status/</span>
          <input
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            placeholder="neondev"
            className="w-full bg-transparent px-3 py-2.5 font-mono text-sm text-ink outline-none placeholder:text-dim"
            required
          />
        </div>
        {fe.slug && <span className={fieldErrorClass}>{fe.slug}</span>}
      </label>

      <label className="block">
        <span className={labelClass}>Description (optional)</span>
        <textarea
          name="description"
          rows={2}
          defaultValue={v?.description ?? initial.description ?? ""}
          placeholder="Live status of NEONDEV services."
          className={`${inputClass} resize-none`}
        />
        {fe.description && <span className={fieldErrorClass}>{fe.description}</span>}
      </label>

      <fieldset>
        <legend className={labelClass}>Monitors on this page</legend>
        {monitors.length === 0 ? (
          <p className="text-sm text-muted">
            No monitors yet.{" "}
            <Link href="/dashboard/new" className="text-neon-indigo hover:underline">
              Add one first
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-line/70 overflow-hidden rounded-lg border border-line">
            {monitors.map((m) => (
              <li key={m.id} className="grid gap-3 bg-bg/40 px-4 py-3 sm:grid-cols-[auto_1fr_1fr] sm:items-center">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    name="monitor_ids"
                    value={m.id}
                    defaultChecked={initialSelected.includes(m.id)}
                    className="size-4 accent-[#a3e635]"
                  />
                  <span className="text-sm font-semibold text-ink">{m.name}</span>
                </label>
                <span className="truncate font-mono text-xs text-dim">{m.url}</span>
                <input
                  name={`name_${m.id}`}
                  defaultValue={names[m.id] ?? ""}
                  placeholder={`Public name (default: ${m.name})`}
                  className="w-full rounded-md border border-line bg-bg/70 px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-dim focus:border-neon-indigo/70"
                />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-dim">Visitors see names and status only — never your URLs.</p>
      </fieldset>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-bg/40 px-4 py-3">
        <input
          type="checkbox"
          name="is_public"
          defaultChecked={v?.is_public ?? initial.is_public ?? true}
          className="mt-0.5 size-4 accent-[#a3e635]"
        />
        <span>
          <span className="block text-sm font-semibold text-ink">Published</span>
          <span className="block text-sm text-muted">Anyone with the link can view this page.</span>
        </span>
      </label>

      {state?.error && (
        <p role="alert" className="rounded-lg border border-neon-lavender/40 px-3 py-2 text-sm text-ink">
          {state.error}
        </p>
      )}
      {state?.saved && (
        <p role="status" className="flex items-center gap-2 text-sm text-body">
          <span className="inline-block size-2 rounded-full bg-lime" /> Saved.
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
        <Link href="/dashboard/status" className="hud transition-colors hover:text-ink">
          Back
        </Link>
      </div>
    </form>
  );
}
