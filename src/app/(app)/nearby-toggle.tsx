"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { NEARBY_COOKIE, NEARBY_KM } from "@/lib/nearby";

function saveKm(v: number) {
  document.cookie = `${NEARBY_COOKIE}=${v}; path=/; max-age=31536000; samesite=lax`;
}

// Off / 25 / 50 / 100 km: include nearby communities' events in the
// Upcoming list (Kai, 12 Nov 2026). Kept per device in a cookie.
export function NearbyToggle({ km }: { km: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const pick = (v: number) => {
    saveKm(v);
    start(() => router.refresh());
  };
  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 text-xs ${pending ? "opacity-60" : ""}`}
    >
      <span className="text-stone-500">Nearby communities:</span>
      {[0, ...NEARBY_KM].map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => pick(v)}
          aria-pressed={km === v}
          className={`rounded-full px-2 py-0.5 font-medium ${
            km === v
              ? "bg-navy text-white"
              : "text-stone-500 ring-1 ring-black/10 hover:text-navy"
          }`}
        >
          {v === 0 ? "Off" : `${v} km`}
        </button>
      ))}
    </div>
  );
}
