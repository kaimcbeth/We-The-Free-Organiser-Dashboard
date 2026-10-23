"use client";

import { useEffect, useRef } from "react";

// Cmd+F / Ctrl+F jumps to the page's own search box instead of the
// browser's find bar. Press it again while in the box for the normal find.
export function useFindShortcut<T extends HTMLInputElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "f") return;
      const el = ref.current;
      if (!el || document.activeElement === el) return;
      e.preventDefault();
      el.focus();
      el.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return ref;
}
