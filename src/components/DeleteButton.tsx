"use client";

import { useFormStatus } from "react-dom";

export function DeleteButton({ name }: { name: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!confirm(`Delete "${name}" and all its history?`)) e.preventDefault();
      }}
      className="rounded-lg border border-neon-lavender/50 px-4 py-2 text-sm font-semibold text-neon-lavender transition-colors hover:bg-neon-lavender/10 disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
