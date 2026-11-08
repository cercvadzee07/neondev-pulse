import { Logo } from "./Logo";

export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/** Shown instead of auth/dashboard pages until Supabase env vars are set. */
export function SetupNotice() {
  const steps = [
    "Create a free project at supabase.com",
    "SQL Editor → paste supabase/migrations/0001_init.sql → Run",
    "Copy .env.example to .env.local and fill in the keys from Project Settings → API",
    "Restart npm run dev",
  ];
  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 sm:px-6">
      <header className="py-6">
        <Logo />
      </header>
      <div className="flex flex-1 items-center justify-center pb-24">
        <div className="glass w-full max-w-lg p-6 sm:p-8">
          <p className="hud mb-4">Setup // Database not connected</p>
          <h1 className="display mb-4 text-4xl">Connect Supabase</h1>
          <p className="mb-6 text-muted">
            The app needs a Supabase project before you can sign in and add monitors.
          </p>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={s} className="flex gap-3 text-sm text-body">
                <span className="font-mono text-dim">0{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </main>
  );
}
