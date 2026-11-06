"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/sheet";
import { createClient } from "@/lib/supabase/client";

// "Community spotlight posted" (RSL, monthly; Kai 6 Nov 2026): suggests a
// community (taking turns month by month among the ones that have been
// active) and writes a caption from how they've been going (0214
// region_spotlight). The photo comes from the community.

type Team = {
  name: string;
  url: string | null;
  handle: string | null;
  founded_on: string | null;
  events_90: number;
  people_90: number;
  next_at: string | null;
  next_title: string | null;
  watched: number;
};

const city = (name: string) => name.replace(/, .*$/, "");

function suggest(teams: Team[]) {
  const active = teams.filter((t) => t.events_90 > 0);
  const pool = active.length ? active : teams;
  if (!pool.length) return "";
  const d = new Date();
  return pool[(d.getFullYear() * 12 + d.getMonth()) % pool.length].name;
}

function caption(t: Team) {
  const name = city(t.name);
  const lines = [`🌟 Community spotlight: We The Free ${name}`, ""];
  const facts: string[] = [];
  if (t.founded_on) {
    const years = new Date().getFullYear() - Number(t.founded_on.slice(0, 4));
    if (years >= 1)
      facts.push(
        `They've been going for ${years} year${years === 1 ? "" : "s"}`,
      );
  }
  if (t.events_90)
    facts.push(
      `${t.events_90} event${t.events_90 === 1 ? "" : "s"} in the last three months${t.people_90 ? `, with ${t.people_90} check-ins` : ""}`,
    );
  if (t.watched)
    facts.push(`${t.watched} Movie Challenge films watched so far`);
  if (facts.length) lines.push(`${facts.join(". ")}. 💪`, "");
  if (t.next_at && t.next_title) {
    const when = new Intl.DateTimeFormat("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(t.next_at));
    lines.push(`Next up: ${t.next_title} on ${when}.`, "");
  }
  lines.push(
    `Live near ${name}? Come along, everyone's welcome and no experience is needed.`,
  );
  if (t.handle) lines.push(`Follow them at @${t.handle.replace(/^@/, "")}`);
  lines.push(t.url ?? "www.activism.wtf/teams");
  return lines.join("\n");
}

export function RegionSpotlightButton({
  regionId,
  className,
}: {
  regionId: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Pick a community
      </button>
      {open && (
        <SpotlightSheet regionId={regionId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function SpotlightSheet({
  regionId,
  onClose,
}: {
  regionId: string;
  onClose: () => void;
}) {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [picked, setPicked] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    let live = true;
    createClient()
      .rpc("region_spotlight", { p_region: regionId })
      .then(({ data, error }) => {
        if (!live) return;
        if (error) setNote("Couldn't load the communities. Try again soon.");
        setTeams((data as Team[] | null) ?? []);
      });
    return () => {
      live = false;
    };
  }, [regionId]);

  const name = picked || (teams ? suggest(teams) : "");
  const team = teams?.find((t) => t.name === name) ?? null;
  const text = team ? caption(team) : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setNote("Copied the caption.");
    } catch {
      setNote("Couldn't copy here. Select the text and copy it instead.");
    }
  }

  return (
    <Sheet title="Community spotlight" onClose={onClose}>
      {!teams ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-navy">Community</span>
            <select
              value={name}
              onChange={(e) => {
                setPicked(e.target.value);
                setNote("");
              }}
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              {teams.map((t) => (
                <option key={t.name} value={t.name}>
                  {city(t.name)}
                  {t.events_90
                    ? ` · ${t.events_90} event${t.events_90 === 1 ? "" : "s"} lately`
                    : " · quiet lately"}
                </option>
              ))}
            </select>
            {!picked && (
              <span className="mt-1 block text-xs text-stone-500">
                Suggested for this month. Communities take turns.
              </span>
            )}
          </label>
          {team && (
            <>
              <pre className="whitespace-pre-wrap rounded-xl bg-white p-3 font-sans text-sm text-navy ring-1 ring-black/5">
                {text}
              </pre>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copy}
                  className="rounded-xl bg-pink px-3 py-1.5 text-sm font-semibold text-navy hover:bg-pink-strong"
                >
                  Copy caption
                </button>
                {team.url && (
                  <a
                    href={team.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-navy/5 px-3 py-1.5 text-sm font-semibold text-navy hover:bg-navy/10"
                  >
                    Their page
                  </a>
                )}
              </div>
              <p className="text-xs text-stone-500">
                Ask their organiser for a favourite photo from a recent event
                and tag their page. Check-ins only count communities that check
                people in on the Movement Hub.
              </p>
            </>
          )}
          {note && <p className="text-sm text-stone-500">{note}</p>}
        </div>
      )}
    </Sheet>
  );
}
