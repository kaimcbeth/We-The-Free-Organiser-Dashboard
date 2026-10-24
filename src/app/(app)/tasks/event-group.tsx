"use client";

import { useSyncExternalStore } from "react";
import { useSearchOpen } from "./action-search";

// Collapsible event group on the Actions page: the arrow hides that event's
// actions but keeps its title, date, count and progress. Remembered on this
// device; searching opens everything.
const KEY = "collapsed-events";
const listeners = new Set<() => void>();

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function toggle(id: string) {
  const set = new Set<string>(JSON.parse(read()));
  if (set.has(id)) set.delete(id);
  else set.add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {}
  listeners.forEach((l) => l());
}

export function EventGroup({
  id,
  header,
  below,
  children,
}: {
  id: string;
  header: React.ReactNode;
  below?: React.ReactNode;
  children: React.ReactNode;
}) {
  const raw = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => "[]",
  );
  const searching = useSearchOpen();
  const collapsed = !searching && (JSON.parse(raw) as string[]).includes(id);

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggle(id)}
          aria-expanded={!collapsed}
          aria-label={
            collapsed
              ? "Show this event's actions"
              : "Hide this event's actions"
          }
          title={collapsed ? "Show actions" : "Hide actions"}
          className="-ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-stone-400 hover:bg-stone-200/60 hover:text-navy"
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-3.5 w-3.5 transition-transform ${collapsed ? "-rotate-90" : ""}`}
            aria-hidden
          >
            <path d="M5 7l5 6 5-6z" />
          </svg>
        </button>
        {header}
      </div>
      {below}
      {!collapsed && children}
    </>
  );
}
