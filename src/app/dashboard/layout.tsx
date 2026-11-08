import { Logo } from "@/components/Logo";
import { SetupNotice, supabaseConfigured } from "@/components/SetupNotice";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!supabaseConfigured) return <SetupNotice />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <header className="flex items-center justify-between gap-4 py-6">
        <Logo />
        <div className="flex min-w-0 items-center gap-4">
          <span className="hud hidden truncate sm:inline">{user?.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-muted transition-colors hover:border-neon-indigo/60 hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
