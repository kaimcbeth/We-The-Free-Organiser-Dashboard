"use client";

import { useRouter } from "next/navigation";

import { SHOW_COOKIE, type ShowActions } from "@/lib/actions-show";

function remember(v: ShowActions) {
  document.cookie = `${SHOW_COOKIE}=${v}; path=/; max-age=31536000; samesite=lax`;
}

// For someone who's both a Regional Support Lead and a community's organiser
// (Kai, 6 Nov 2026): show just the RSL actions, just the community's, or both.
// Remembered on this device.
export function ShowToggle({
  value,
  community,
}: {
  value: ShowActions;
  community: string;
}) {
  const router = useRouter();
  const pick = (v: ShowActions) => {
    remember(v);
    router.refresh();
  };
  const options: [ShowActions, string][] = [
    ["both", "Both"],
    ["rsl", "RSL"],
    ["local", `${community} organiser`],
  ];
  return (
    <div
      role="group"
      aria-label="Which actions to show"
      className="inline-flex rounded-full bg-stone-100 p-0.5 text-xs font-medium"
    >
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => pick(v)}
          aria-pressed={value === v}
          className={`rounded-full px-3 py-1 ${
            value === v
              ? "bg-navy text-white"
              : "text-stone-500 hover:text-navy"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
