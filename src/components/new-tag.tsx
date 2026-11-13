"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isFresh } from "@/lib/new-resources";

// "New" tags on Resources: wrap the page in SeenProvider, put
// data-resource="<key>" on each card and <NewTag k="<key>" /> in its title.
// Opening (clicking) the card marks it seen for that person.

const Seen = createContext<Set<string> | null>(null);

export function SeenProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [seen, setSeen] = useState<Set<string> | null>(null);

  useEffect(() => {
    let live = true;
    supabase
      .from("resource_seen")
      .select("key")
      .then(({ data, error }) => {
        if (!live) return;
        // Couldn't check (signed out, preview): show no tags rather than all.
        setSeen(
          error ? null : new Set((data ?? []).map((r) => r.key as string)),
        );
      });
    return () => {
      live = false;
    };
  }, [supabase]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("[data-resource]");
      const key = el?.getAttribute("data-resource");
      if (!key || !isFresh(key)) return;
      setSeen((s) => {
        if (!s || s.has(key)) return s;
        supabase
          .from("resource_seen")
          .upsert(
            { key },
            { onConflict: "user_id,key", ignoreDuplicates: true },
          )
          .then(() => {});
        return new Set([...s, key]);
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [supabase]);

  return <Seen.Provider value={seen}>{children}</Seen.Provider>;
}

export function NewTag({
  k,
  className = "",
}: {
  k: string;
  className?: string;
}) {
  const seen = useContext(Seen);
  if (!seen || seen.has(k) || !isFresh(k)) return null;
  return (
    <span
      className={`new-tag ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 align-middle text-[11px] font-extrabold uppercase tracking-wider text-navy ${className}`}
    >
      <span aria-hidden>✨</span>New
    </span>
  );
}
