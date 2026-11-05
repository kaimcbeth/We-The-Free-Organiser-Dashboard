"use client";

import { useEffect, useState, type ReactNode } from "react";

// Planner | Make a post | Ready-made posts on the Social Media Hub. "#planner",
// "#make" or "#posts" in the address opens that one (Save to planner links to
// #planner).
type Tab = "planner" | "make" | "posts";
const fromHash = (): Tab =>
  window.location.hash === "#posts"
    ? "posts"
    : window.location.hash === "#make"
      ? "make"
      : "planner";
export function SocialHubTabs({
  planner,
  make,
  posts,
}: {
  planner: ReactNode;
  make?: ReactNode;
  posts: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>(() =>
    typeof window !== "undefined" ? fromHash() : "planner",
  );
  // "Planner" links (Save to planner) switch tabs on this page too.
  useEffect(() => {
    const on = () => setTab(fromHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const pick = (t: Tab) => {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
  };
  return (
    <div>
      <div className="mb-4 inline-flex flex-wrap rounded-full bg-stone-100 p-1 text-sm font-medium">
        {(
          [
            ["planner", "Planner"],
            ["make", "Make a post"],
            ["posts", "Ready-made posts"],
          ] as const
        )
          .filter(([id]) => id !== "make" || make)
          .map(([id, label]) => (
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
      {tab === "planner" ? planner : tab === "make" && make ? make : posts}
    </div>
  );
}
