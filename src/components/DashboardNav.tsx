"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Monitors" },
  { href: "/dashboard/status", label: "Status pages" },
];

export function DashboardNav() {
  const path = usePathname();
  const active = (href: string) =>
    href === "/dashboard" ? !path.startsWith("/dashboard/status") : path.startsWith(href);

  return (
    <nav className="flex gap-1 rounded-lg border border-line bg-panel/60 p-1" aria-label="Dashboard">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={active(l.href) ? "page" : undefined}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
            active(l.href) ? "bg-line/70 text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
