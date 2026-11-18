"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Insights | People switch (Kai, 19 Nov 2026: People merged into Insights).
export function InsightsViewSwitch() {
  const path = usePathname();
  const people = path === "/people";
  if (path !== "/insights" && !people) return null;
  const tab = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-semibold ${
      active ? "bg-white text-navy shadow-sm" : "text-stone-500 hover:text-navy"
    }`;
  return (
    <div
      data-tour="insights-switch"
      className="mb-4 inline-flex rounded-xl bg-stone-200/70 p-1"
    >
      <Link href="/insights" className={tab(!people)}>
        Insights
      </Link>
      <Link href="/people" className={tab(people)}>
        People
      </Link>
    </div>
  );
}
