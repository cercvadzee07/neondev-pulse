import { Logo } from "@/components/Logo";
import { SetupNotice, supabaseConfigured } from "@/components/SetupNotice";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in — NEONDEV Pulse" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (!supabaseConfigured) return <SetupNotice />;

  const { next, error } = await searchParams;
  const safeNext = next?.startsWith("/dashboard") ? next : "/dashboard";
  const notice = error === "confirm" ? "That confirmation link is invalid or expired. Try signing in." : undefined;

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 sm:px-6">
      <header className="py-6">
        <Logo />
      </header>
      <div className="flex flex-1 items-center justify-center pb-24">
        <LoginForm next={safeNext} notice={notice} />
      </div>
    </main>
  );
}
