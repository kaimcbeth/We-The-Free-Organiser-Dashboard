"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Member tabs, styled like the organiser Hub's.
const LINKS = [
  {
    href: "/me",
    label: "Events",
    match: (p: string) => p === "/me" || p.startsWith("/me/welcome"),
  },
  {
    href: "/me/guide",
    label: "Outreach",
    match: (p: string) => p.startsWith("/me/guide"),
  },
  {
    href: "/me/photos",
    label: "Photo Hub",
    match: (p: string) => p.startsWith("/me/photos"),
  },
  {
    href: "/me/support",
    label: "How you can help",
    match: (p: string) => p.startsWith("/me/support"),
  },
  {
    href: "/me/resources",
    label: "Resources",
    match: (p: string) => p.startsWith("/me/resources"),
  },
  {
    href: "/me/feedback",
    label: "Feedback",
    match: (p: string) => p.startsWith("/me/feedback"),
  },
];

export function MemberNav() {
  const path = usePathname();
  return (
    <nav className="mx-auto flex max-w-2xl gap-1 overflow-x-auto whitespace-nowrap px-4 pt-2 [scrollbar-width:none]">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium ${
            l.match(path)
              ? "border-pink text-white"
              : "border-transparent text-white/65 hover:text-white"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
