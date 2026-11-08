"use client";

import { useFormStatus } from "react-dom";

export function CheckNowButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-neon-indigo/60 disabled:opacity-60"
    >
      <span
        aria-hidden
        className={`inline-block size-3 rounded-full border-2 border-neon-indigo border-t-transparent ${pending ? "animate-spin" : ""}`}
      />
      {pending ? "Checking…" : "Check now"}
    </button>
  );
}
