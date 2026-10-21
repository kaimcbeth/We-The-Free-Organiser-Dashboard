"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LATEST_CHANGE } from "@/lib/changelog";

// Opening What's new clears the dot in the menu.
export function MarkSeen() {
  const router = useRouter();
  useEffect(() => {
    if (document.cookie.includes(`whats_new_seen=${LATEST_CHANGE}`)) return;
    document.cookie = `whats_new_seen=${LATEST_CHANGE}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);
  return null;
}
