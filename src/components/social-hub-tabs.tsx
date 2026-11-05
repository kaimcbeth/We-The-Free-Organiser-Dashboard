"use client";

import { useEffect, useState, type ReactNode } from "react";

// Planner | Ready-made posts on the Social Media Hub. "#planner" or
// "#posts" in the address opens that one (Save to planner links to #planner).
export function SocialHubTabs({
  planner,
  posts,
}: {
  planner: ReactNode;
  posts: ReactNode;
}) {
  const [tab, setTab] = useState<"planner" | "posts">(() =>
    typeof window !== "undefined" && window.location.hash === "#posts"
      ? "posts"
      : "planner",
  );
  // "Planner" links (Save to planner) switch tabs on this page too.
  useEffect(() => {
    const on = () =>
      setTab(window.location.hash === "#posts" ? "posts" : "planner");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const pick = (t: "planner" | "posts") => {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
  };
  return (
    <div>
      <div className="mb-4 inline-flex rounded-full bg-stone-100 p-1 text-sm font-medium">
        {(
          [
            ["planner", "Planner"],
            ["posts", "Ready-made posts"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => pick(id)}
            className={`rounded-full px-4 py-1.5 ${tab === id ? "bg-white text-navy shadow-sm" : "text-stone-500 hover:text-navy"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "planner" ? planner : posts}
    </div>
  );
}
