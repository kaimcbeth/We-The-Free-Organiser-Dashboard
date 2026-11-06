"use client";

import { useCallback, useSyncExternalStore } from "react";

// Folded cards, remembered on this device (Kai, 6 Nov 2026: "I want the
// sublists and the big cards to be collapsible"). One localStorage key holds
// every folded card's key, so the server render (nothing folded) matches the
// first client render and the saved state follows straight after.

const STORE = "wtf-folded";
const listeners = new Set<() => void>();
let cache: string | null = null;

function read(): string {
  if (cache !== null) return cache;
  try {
    cache = localStorage.getItem(STORE) ?? "";
  } catch {
    cache = "";
  }
  return cache;
}

function write(keys: Set<string>) {
  cache = [...keys].slice(-500).join("\n");
  try {
    localStorage.setItem(STORE, cache);
  } catch {
    // Private mode etc.: it just won't be remembered.
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useFold(key: string): [boolean, () => void] {
  const raw = useSyncExternalStore(subscribe, read, () => "");
  const folded = raw.split("\n").includes(key);
  const toggle = useCallback(() => {
    const keys = new Set(read().split("\n").filter(Boolean));
    if (keys.has(key)) keys.delete(key);
    else keys.add(key);
    write(keys);
  }, [key]);
  return [folded, toggle];
}
