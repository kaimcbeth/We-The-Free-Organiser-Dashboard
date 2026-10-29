"use client";

import { usePathname } from "next/navigation";

// Pages that already work across all communities.
const REGION_WIDE = [
  "/tasks",
  "/insights",
  "/calendar",
  "/roles",
  "/people",
  "/facebook-groups",
  "/test-accounts",
  "/usage",
  "/events/",
];

export function AllCommunitiesNotice({ teamName }: { teamName: string }) {
  const path = usePathname();
  if (path === "/" || REGION_WIDE.some((p) => path.startsWith(p))) return null;
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-4">
      <p className="rounded-xl bg-cyan/15 px-3 py-2 text-sm text-navy">
        &ldquo;All communities&rdquo; works on Events, Actions and Insights for
        now. This page is showing{" "}
        <span className="font-semibold">{teamName}</span>.
      </p>
    </div>
  );
}
