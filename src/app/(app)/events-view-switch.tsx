"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// List | Calendar switch at the top of the Events pages.
export function EventsViewSwitch() {
  const path = usePathname();
  const calendar = path.startsWith("/calendar");
  if (path !== "/" && !calendar) return null;
  const tab = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-semibold ${
      active ? "bg-white text-navy shadow-sm" : "text-stone-500 hover:text-navy"
    }`;
  return (
    <div className="mb-4 inline-flex rounded-xl bg-stone-200/70 p-1">
      <Link
        href="/events-view?v=list"
        className={tab(!calendar)}
        prefetch={false}
      >
        List
      </Link>
      <Link
        href="/events-view?v=calendar"
        className={tab(calendar)}
        prefetch={false}
      >
        Calendar
      </Link>
    </div>
  );
}
