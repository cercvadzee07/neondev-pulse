import { createClient } from "@supabase/supabase-js";

/** Cookie-less anon client for public pages — cacheable, RLS applies as a visitor. */
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
