"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  {
    href: "/",
    label: "Events",
    match: (p: string) => p === "/" || p.startsWith("/events"),
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
  canManageRoles,
  showCalendar,
  openTasks = 0,
}: {
  canManageRoles: boolean;
  showCalendar: boolean;
  openTasks?: number;
}) {
  const path = usePathname();
  const base = [
    ...(showCalendar
      ? [
          LINKS[0],
          {
            href: "/calendar",
            label: "Calendar",
            match: (p: string) => p.startsWith("/calendar"),
          },
          ...LINKS.slice(1),
        ]
      : LINKS),
  ];
  // Tasks sits right after Events (and Calendar).
  base.splice(showCalendar ? 2 : 1, 0, {
    href: "/tasks",
    label: "Tasks",
    match: (p: string) => p.startsWith("/tasks"),
  });
  const links = canManageRoles
    ? [
        ...base,
        {
          href: "/roles",
          label: "Roles",
          match: (p: string) => p.startsWith("/roles"),
        },
      ]
    : base;
  return (
    <nav className="mx-auto flex max-w-2xl gap-1 overflow-x-auto whitespace-nowrap px-4 pt-2 [scrollbar-width:none]">
      {links.map((l) => {
        const active = l.match(path);
        return (
          <Link
            key={l.href}
            href={l.href}
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
