"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Events", match: (p: string) => p === "/" || p.startsWith("/events") },
  { href: "/people", label: "People", match: (p: string) => p.startsWith("/people") },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="mx-auto flex max-w-2xl gap-1 px-4 pt-2">
      {LINKS.map((l) => {
        const active = l.match(path);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium ${
              active ? "border-brand text-stone-900" : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
