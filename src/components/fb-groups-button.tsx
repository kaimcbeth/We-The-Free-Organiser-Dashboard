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
      .eq("team_id", teamId)
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
      const w = window.open(g.url, "_blank", "noopener");
      if (!w) missed++;
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
          Allow pop-ups for this site (the icon at the right of the address
          bar), then tap again, or open them one by one below.
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
