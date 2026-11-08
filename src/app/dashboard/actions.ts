"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runChecks } from "@/lib/checker";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Field = "name" | "url" | "interval_minutes" | "expected_status";
export type MonitorFormState =
  | { error?: string; fieldErrors?: Partial<Record<Field, string>>; values?: Record<Field, string> }
  | undefined;

/** Echo back what the user typed so the form keeps it after a failed submit. */
function echo(formData: FormData): Record<Field, string> {
  const get = (k: Field) => String(formData.get(k) ?? "");
  return { name: get("name"), url: get("url"), interval_minutes: get("interval_minutes"), expected_status: get("expected_status") };
}

const INTERVALS = [5, 10, 15, 30, 60];

function parseMonitor(formData: FormData) {
  const fieldErrors: Partial<Record<Field, string>> = {};

  const name = String(formData.get("name") ?? "").trim();
  if (!name) fieldErrors.name = "Give it a name.";
  else if (name.length > 80) fieldErrors.name = "Keep it under 80 characters.";

  let url = String(formData.get("url") ?? "").trim();
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol) || !u.hostname.includes(".")) throw new Error();
  } catch {
    fieldErrors.url = "Enter a full URL, e.g. https://example.com";
  }

  const interval_minutes = Number(formData.get("interval_minutes"));
  if (!INTERVALS.includes(interval_minutes)) fieldErrors.interval_minutes = "Pick an interval.";

  const expected_status = Number(formData.get("expected_status") || 200);
  if (!Number.isInteger(expected_status) || expected_status < 100 || expected_status > 599)
    fieldErrors.expected_status = "Use an HTTP status between 100 and 599.";

  if (Object.keys(fieldErrors).length) return { ok: false as const, fieldErrors };
  return { ok: true as const, data: { name, url, interval_minutes, expected_status } };
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createMonitor(_prev: MonitorFormState, formData: FormData): Promise<MonitorFormState> {
  const parsed = parseMonitor(formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, values: echo(formData) };

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("monitors").insert({ ...parsed.data, user_id: user.id });
  if (error) return { error: error.message, values: echo(formData) };

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateMonitor(
  id: string,
  _prev: MonitorFormState,
  formData: FormData,
): Promise<MonitorFormState> {
  const parsed = parseMonitor(formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, values: echo(formData) };

  const { supabase } = await requireUser();
  const { data: existing } = await supabase.from("monitors").select("url").eq("id", id).single();
  const urlChanged = existing && existing.url !== parsed.data.url;

  const { error } = await supabase
    .from("monitors")
    .update({ ...parsed.data, ...(urlChanged ? { current_status: "pending", last_checked_at: null } : {}) })
    .eq("id", id);
  if (error) return { error: error.message, values: echo(formData) };

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function toggleMonitor(formData: FormData) {
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  const { supabase } = await requireUser();
  await supabase.from("monitors").update({ is_active: active }).eq("id", id);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${id}/edit`);
}

export async function deleteMonitor(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase } = await requireUser();
  await supabase.from("monitors").delete().eq("id", id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

/** "Check now": run checks for the signed-in user's active monitors. */
export async function checkNow() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("monitors").select("id").eq("is_active", true);
  const ids = (data ?? []).map((m) => m.id as string);
  // RLS above guarantees these ids belong to the user; 30s gap prevents hammering.
  if (ids.length) await runChecks(createAdminClient(), { monitorIds: ids, minGapMs: 30_000 });
  revalidatePath("/dashboard");
}

/** "Check now" on a single monitor's page. */
export async function checkMonitorNow(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase } = await requireUser();
  const { data } = await supabase.from("monitors").select("id").eq("id", id).eq("is_active", true).maybeSingle();
  if (data) await runChecks(createAdminClient(), { monitorIds: [id], minGapMs: 30_000 });
  revalidatePath(`/dashboard/${id}`);
  revalidatePath("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
