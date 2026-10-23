"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Group = { id: string; name: string; url: string };

// On the Facebook groups promo tasks: open every saved local group in its own
// tab with one tap, or add groups if there aren't any yet.
export function FbGroupsButton({
  teamId,
  canEdit,
}: {
  teamId: string;
  canEdit: boolean; // organisers can edit the list
}) {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [blocked, setBlocked] = useState(0);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    let live = true;
    createClient()
      .from("facebook_groups")
      .select("id, name, url")
      // Its own groups plus ones shared with nearby communities.
      .or(`team_id.eq.${teamId},also_team_ids.cs.{${teamId}}`)
      .is("archived_at", null)
      .order("name")
      .then(({ data }) => {
        if (live) setGroups((data ?? []) as Group[]);
      });
    return () => {
      live = false;
    };
  }, [teamId]);

  if (groups === null) return null;
  if (groups.length === 0)
    return canEdit ? (
      <Link
        href="/facebook-groups"
        className="rounded-xl bg-[#0866FF]/10 px-3 py-1.5 text-sm font-semibold text-[#0866FF] hover:bg-[#0866FF]/15"
      >
        + Add your local Facebook groups
      </Link>
    ) : null;

  function openAll() {
    // Browsers only allow the first tab unless pop-ups are allowed for the
    // site; count the ones that didn't open so we can say so.
    let missed = 0;
    for (const g of groups!) {
      // No "noopener" here: with it, window.open always returns null, so we
      // couldn't tell a blocked tab from an opened one. Cut the link instead.
      const w = window.open(g.url, "_blank");
      if (w) w.opener = null;
      else missed++;
    }
    setBlocked(missed);
    if (missed) setShowList(true);
  }

  return (
    <span className="flex w-full flex-col gap-2">
      <span className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={openAll}
          className="rounded-xl bg-[#0866FF] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110"
        >
          Open {groups.length} Facebook group{groups.length === 1 ? "" : "s"} ↗
        </button>
        <button
          type="button"
          onClick={() => setShowList(!showList)}
          className="rounded px-1 py-0.5 text-xs text-stone-400 hover:text-stone-700 hover:underline"
        >
          {showList ? "Hide list" : "Show list"}
        </button>
        {canEdit && (
          <Link
            href="/facebook-groups"
            className="rounded px-1 py-0.5 text-xs text-stone-400 hover:text-stone-700 hover:underline"
          >
            Edit groups
          </Link>
        )}
      </span>
      {blocked > 0 && (
        <span className="rounded-lg bg-yellow/30 px-2.5 py-1.5 text-xs text-navy">
          Your browser stopped {blocked} tab{blocked === 1 ? "" : "s"} opening.
          Allow pop-ups for this site, then tap again, or open them one by one
          below. <PopupHelp />
        </span>
      )}
      {showList && (
        <ul className="space-y-1 text-sm">
          {groups.map((g) => (
            <li key={g.id}>
              <a
                href={g.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0866FF] hover:underline"
              >
                {g.name} ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

type Browser =
  "chrome" | "brave" | "edge" | "firefox" | "safari" | "ios" | "android";

const BROWSERS: { id: Browser; label: string; steps: string[] }[] = [
  {
    id: "chrome",
    label: "Chrome",
    steps: [
      "Right after a tab is blocked, click the small pop-up icon at the right end of the address bar.",
      "Choose “Always allow pop-ups and redirects from wtf-organiser.vercel.app”, then Done.",
      "No icon? Go to Chrome’s menu (⋮) → Settings → Privacy and security → Site settings → Pop-ups and redirects, and add this site under “Allowed”.",
    ],
  },
  {
    id: "brave",
    label: "Brave",
    steps: [
      "Click the sliders icon at the far left of the address bar (just before the web address).",
      "Click Site settings.",
      "Find “Pop-ups and redirects” and change it to Allow.",
      "Come back to this tab, reload, and tap Open again.",
    ],
  },
  {
    id: "edge",
    label: "Edge",
    steps: [
      "Right after a tab is blocked, click the pop-up icon at the right end of the address bar.",
      "Choose “Always allow pop-ups and redirects from wtf-organiser.vercel.app”, then Done.",
      "No icon? Menu (…) → Settings → Cookies and site permissions → Pop-ups and redirects → Allow → Add this site.",
    ],
  },
  {
    id: "firefox",
    label: "Firefox",
    steps: [
      "A yellow bar appears under the address bar saying Firefox prevented pop-ups.",
      "Click Options (or Preferences) on that bar.",
      "Choose “Allow pop-ups for wtf-organiser.vercel.app”.",
    ],
  },
  {
    id: "safari",
    label: "Safari (Mac)",
    steps: [
      "In the menu bar, click Safari → Settings for wtf-organiser.vercel.app…",
      "Set “Pop-up Windows” to Allow.",
      "Reload this page and tap Open again.",
    ],
  },
  {
    id: "ios",
    label: "iPhone / iPad",
    steps: [
      "Open the Settings app → Apps → Safari (on older iPhones: Settings → Safari).",
      "Turn off “Block Pop-ups”.",
      "Phones only open a few tabs at a time, so the list below is often easier.",
    ],
  },
  {
    id: "android",
    label: "Android",
    steps: [
      "In Chrome, tap ⋮ → Settings → Site settings → Pop-ups and redirects.",
      "Add this site to the allowed list (or turn pop-ups on).",
      "Phones only open a few tabs at a time, so the list below is often easier.",
    ],
  },
];

function detectBrowser(): Browser {
  const ua = navigator.userAgent;
  if ((navigator as Navigator & { brave?: unknown }).brave) return "brave";
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Edg\//.test(ua)) return "edge";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "safari";
  return "chrome";
}

// "How do I allow pop-ups?": step-by-step for the common browsers, starting
// on the one we think they're using.
function PopupHelp() {
  const [open, setOpen] = useState(false);
  const [which, setWhich] = useState<Browser | null>(null);
  const current = BROWSERS.find((b) => b.id === which) ?? BROWSERS[0];
  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!which) setWhich(detectBrowser());
          setOpen(!open);
        }}
        className="font-semibold underline underline-offset-2 hover:text-pink-ink"
      >
        {open ? "Hide help" : "How do I allow pop-ups?"}
      </button>
      {open && (
        <span className="mt-2 block rounded-lg bg-white/70 p-2.5">
          <span className="flex flex-wrap gap-1">
            {BROWSERS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setWhich(b.id)}
                className={`rounded-full px-2.5 py-0.5 font-semibold ring-1 ${
                  b.id === current.id
                    ? "bg-navy text-white ring-navy"
                    : "bg-white text-navy ring-stone-300 hover:bg-stone-50"
                }`}
              >
                {b.label}
              </button>
            ))}
          </span>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {current.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </span>
      )}
    </>
  );
}
