"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Field = "title" | "slug" | "description";
export type StatusPageFormState =
  | {
      error?: string;
      saved?: boolean;
      fieldErrors?: Partial<Record<Field, string>>;
      values?: { title: string; slug: string; description: string; is_public: boolean; monitors: string[] };
    }
  | undefined;

const SLUG_RE = /^[a-z0-9](-?[a-z0-9])*$/;

function parse(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const description = String(formData.get("description") ?? "").trim();
  const is_public = formData.get("is_public") === "on";
  const monitors = formData.getAll("monitor_ids").map(String);
  const names = Object.fromEntries(monitors.map((id) => [id, String(formData.get(`name_${id}`) ?? "").trim()]));

  const fieldErrors: Partial<Record<Field, string>> = {};
  if (!title) fieldErrors.title = "Give the page a title.";
  else if (title.length > 80) fieldErrors.title = "Keep it under 80 characters.";
  if (slug.length < 3 || slug.length > 40 || !SLUG_RE.test(slug))
    fieldErrors.slug = "3–40 characters: lowercase letters, numbers and single dashes.";
  if (description.length > 280) fieldErrors.description = "Keep it under 280 characters.";

  const values = { title, slug, description, is_public, monitors };
  return { fieldErrors, values, names };
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function friendly(message: string) {
  return /duplicate key|status_pages_slug_key/.test(message) ? "That address is taken — try another." : message;
}

async function syncMonitors(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pageId: string,
  ids: string[],
  names: Record<string, string>,
) {
  await supabase.from("status_page_monitors").delete().eq("status_page_id", pageId);
  if (!ids.length) return null;
  const { error } = await supabase.from("status_page_monitors").insert(
    ids.map((monitor_id, i) => ({
      status_page_id: pageId,
      monitor_id,
      display_name: names[monitor_id] || null,
      sort_order: i,
    })),
  );
  return error;
}

export async function createStatusPage(_prev: StatusPageFormState, formData: FormData): Promise<StatusPageFormState> {
  const { fieldErrors, values, names } = parse(formData);
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("status_pages")
    .insert({
      user_id: user.id,
      title: values.title,
      slug: values.slug,
      description: values.description || null,
      is_public: values.is_public,
    })
    .select("id")
    .single();
  if (error) {
    const msg = friendly(error.message);
    return msg.startsWith("That address") ? { fieldErrors: { slug: msg }, values } : { error: msg, values };
  }

  const linkErr = await syncMonitors(supabase, data.id, values.monitors, names);
  if (linkErr) return { error: linkErr.message, values };

  revalidatePath("/dashboard/status");
  redirect(`/dashboard/status/${data.id}?created=1`);
}

export async function updateStatusPage(
  id: string,
  _prev: StatusPageFormState,
  formData: FormData,
): Promise<StatusPageFormState> {
  const { fieldErrors, values, names } = parse(formData);
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const { supabase } = await requireUser();
  const { data: before } = await supabase.from("status_pages").select("slug").eq("id", id).single();
  const { error } = await supabase
    .from("status_pages")
    .update({
      title: values.title,
      slug: values.slug,
      description: values.description || null,
      is_public: values.is_public,
    })
    .eq("id", id);
  if (error) {
    const msg = friendly(error.message);
    return msg.startsWith("That address") ? { fieldErrors: { slug: msg }, values } : { error: msg, values };
  }

  const linkErr = await syncMonitors(supabase, id, values.monitors, names);
  if (linkErr) return { error: linkErr.message, values };

  revalidatePath("/dashboard/status");
  revalidatePath(`/status/${values.slug}`);
  if (before?.slug && before.slug !== values.slug) revalidatePath(`/status/${before.slug}`);
  return { saved: true, values };
}

export async function deleteStatusPage(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase } = await requireUser();
  const { data } = await supabase.from("status_pages").select("slug").eq("id", id).single();
  await supabase.from("status_pages").delete().eq("id", id);
  if (data?.slug) revalidatePath(`/status/${data.slug}`);
  revalidatePath("/dashboard/status");
  redirect("/dashboard/status");
}
