"use client";

import { useActionState, useState } from "react";
import { authenticate, type AuthState } from "./actions";
import { inputClass, labelClass } from "@/components/form-styles";

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, action, pending] = useActionState<AuthState, FormData>(authenticate, undefined);

  return (
    <div className="glass w-full max-w-md p-6 sm:p-8">
      <p className="hud mb-4">{mode === "signin" ? "Auth // Sign in" : "Auth // New account"}</p>
      <h1 className="display mb-8 text-4xl">
        {mode === "signin" ? "Welcome back." : <span className="text-gradient">Start monitoring.</span>}
      </h1>

      <form action={action} className="space-y-5">
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="next" value={next} />

        <label className="block">
          <span className={labelClass}>Email</span>
          <input
            key={state?.email ?? ""}
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={state?.email}
            required
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Password</span>
          <input
            name="password"
            type="password"
            minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            className={inputClass}
          />
        </label>

        {(state?.error || notice) && (
          <p role="alert" className="rounded-lg border border-neon-lavender/40 px-3 py-2 text-sm text-ink">
            {state?.error ?? notice}
          </p>
        )}
        {state?.message && (
          <p role="status" className="flex items-start gap-2 rounded-lg border border-lime/40 px-3 py-2 text-sm text-body">
            <span className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-lime" />
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-lime px-4 py-3 text-sm font-bold text-bg transition-opacity disabled:opacity-60"
        >
          {pending ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="hud mt-6 transition-colors hover:text-ink"
      >
        {mode === "signin" ? "No account? Create one →" : "Have an account? Sign in →"}
      </button>
    </div>
  );
}
