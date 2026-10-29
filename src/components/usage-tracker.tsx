"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sectionOf } from "@/lib/usage";

// Notes each page a signed-in person opens (for God Mode's usage page).
// Ignores reloads of the same page within a minute.
let last = { path: "", at: 0 };

export function UsageTracker() {
  const path = usePathname();
  useEffect(() => {
    const section = sectionOf(path);
    if (!section) return;
    const now = Date.now();
    if (last.path === path && now - last.at < 60_000) return;
    last = { path, at: now };
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      supabase
        .rpc("log_page_view", { p_section: section, p_path: path })
        .then(() => {});
    });
  }, [path]);
  return null;
}
