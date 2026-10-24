"use client";

import { useEffect, useState } from "react";

// Small search for the Actions page. Filters what's on the page (cards tagged
// with data-search), opening hidden sections so nothing's missed.
export const SEARCH_EVENT = "action-search";

export function useSearchOpen() {
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const on = (e: Event) => setSearching(!!(e as CustomEvent<string>).detail);
    window.addEventListener(SEARCH_EVENT, on);
    return () => window.removeEventListener(SEARCH_EVENT, on);
  }, []);
  return searching;
}

export function ActionSearch() {
  const [q, setQ] = useState("");
  const [none, setNone] = useState(false);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(SEARCH_EVENT, { detail: q.trim() }));
    // Let opened sections render before filtering.
    const t = setTimeout(() => {
      const words = q.toLowerCase().split(/\s+/).filter(Boolean);
      let shown = 0;
      document.querySelectorAll<HTMLElement>("[data-search]").forEach((el) => {
        const text = (el.dataset.search ?? "").toLowerCase();
        const hit = words.every((w) => text.includes(w));
        el.style.display = hit ? "" : "none";
        if (hit) shown++;
      });
      // Hide event groups with nothing left in them.
      document
        .querySelectorAll<HTMLElement>("[data-search-group]")
        .forEach((g) => {
          const any = [
            ...g.querySelectorAll<HTMLElement>("[data-search]"),
          ].some((el) => el.style.display !== "none");
          g.style.display = any || !words.length ? "" : "none";
        });
      setNone(words.length > 0 && shown === 0);
    }, 30);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <div className="relative">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search actions or events"
          className="w-full rounded-xl bg-white py-2 pl-9 pr-3 text-sm shadow-sm ring-1 ring-black/10 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-cyan"
        />
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 4 4" strokeLinecap="round" />
        </svg>
      </div>
      {none && (
        <p className="mt-2 text-sm text-stone-500">No actions match “{q}”.</p>
      )}
    </div>
  );
}
