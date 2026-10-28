"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  {
    href: "/",
    label: "Events",
    match: (p: string) =>
      p === "/" || p.startsWith("/events") || p.startsWith("/calendar"),
  },
  {
    href: "/people",
    label: "People",
    match: (p: string) => p.startsWith("/people"),
  },
  {
    href: "/insights",
    label: "Insights",
    match: (p: string) => p.startsWith("/insights"),
  },
];

export function NavLinks({
  openTasks = 0,
  isGod = false,
}: {
  openTasks?: number;
  isGod?: boolean;
}) {
  const path = usePathname();
  // Calendar lives inside Events (List | Calendar switch on the page).
  const base = [...LINKS];
  // Tasks sits right after Events (and Calendar).
  base.splice(1, 0, {
    href: "/tasks",
    label: "Actions",
    match: (p: string) => p.startsWith("/tasks"),
  });
  // Roles live on People now (the + Role button, and the \"Has a role\" filter).
  const links = base;
  links.push({
    href: "/resources",
    label: "Resources",
    match: (p: string) => p.startsWith("/resources"),
  });
  if (isGod)
    links.push({
      href: "/facebook-groups",
      label: "FB groups",
      match: (p: string) => p.startsWith("/facebook-groups"),
    });
  return (
    <nav className="mx-auto flex max-w-2xl gap-1 overflow-x-auto whitespace-nowrap px-4 pt-2 [scrollbar-width:none]">
      {links.map((l) => {
        const active = l.match(path);
        return (
          <Link
            key={l.href}
            href={l.href}
            data-tour={`nav-${l.label.toLowerCase().replace(/\W+/g, "-")}`}
            className={`border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium ${
              active
                ? "border-pink text-white"
                : "border-transparent text-white/65 hover:text-white"
            }`}
          >
            {l.label}
            {l.href === "/tasks" && openTasks > 0 && (
              <span className="ml-1.5 rounded-full bg-pink px-1.5 py-0.5 text-[10px] font-bold text-navy">
                {openTasks}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
