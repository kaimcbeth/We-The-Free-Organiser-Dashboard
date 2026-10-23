"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { markAllNotificationsRead } from "@/app/buddy-actions";

export type BellItem = {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  unread: boolean;
  when: string;
};

export function BellMenu({
  unread,
  items,
  demo = false,
}: {
  unread: number;
  items: BellItem[];
  demo?: boolean; // tour examples: nothing to mark as read
}) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(unread);
  const [, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    // Opening the preview counts as seeing them (the pink dots stay for now).
    if (next && count > 0 && !demo) {
      setCount(0);
      start(() => markAllNotificationsRead());
    }
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        data-tour="bell"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/85 hover:bg-white/10"
        aria-label={count ? `Notifications, ${count} unread` : "Notifications"}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path
            d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10.3 21a1.94 1.94 0 0 0 3.4 0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {count > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink px-1 text-[10px] font-bold text-navy">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          data-tour="bell-menu"
          className="fixed left-4 right-4 top-16 z-50 overflow-hidden rounded-2xl bg-white text-navy shadow-xl ring-1 ring-black/10 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
            <p className="font-semibold">Notifications</p>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-pink-ink hover:underline"
            >
              See all
            </Link>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-stone-500">
              Nothing yet. Tasks and reminders will show up here.
            </p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {items.map((n) => (
                <li
                  key={n.id}
                  className="border-b border-black/5 last:border-0"
                >
                  <Link
                    href={n.url ?? "/notifications"}
                    onClick={() => setOpen(false)}
                    className="flex gap-3 px-4 py-3 hover:bg-stone-50"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.unread ? "bg-pink" : "bg-transparent"}`}
                      aria-label={n.unread ? "Unread" : undefined}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {n.title}
                        </span>
                        <span className="shrink-0 text-xs text-stone-400">
                          {n.when}
                        </span>
                      </span>
                      {n.body && (
                        <span className="line-clamp-2 text-sm text-stone-500">
                          {n.body}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
