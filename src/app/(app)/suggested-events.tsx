"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  NEW_EVENT_URL,
  onBoardLine,
  shortDate,
  whenLabel,
  type Suggestion,
} from "@/lib/special-events";

// Faded "Suggested" cards for special events coming up. Nothing here is
// required: "Plan it" marks the team as on board and opens activism.wtf's
// event page; × hides it until next year.
export function SuggestedEvents({
  teamId,
  suggestions,
  on,
  canManage,
}: {
  teamId: string;
  suggestions: Suggestion[];
  on: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [enabled, setEnabled] = useState(on);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    start(async () => {
      await createClient().rpc("set_suggest_events", {
        p_team_id: teamId,
        p_on: next,
      });
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-3 text-xs text-stone-400">
        {canManage && (
          <Link
            href="/events/special"
            className="hover:text-navy hover:underline"
          >
            Special events
          </Link>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={toggle}
          disabled={pending}
          className="flex items-center gap-1.5 hover:text-navy"
          title="Suggestions for special events like Halloween, a few weeks before"
        >
          Suggested events
          <span
            className={`relative inline-block h-3.5 w-6 rounded-full transition-colors ${enabled ? "bg-cyan" : "bg-stone-300"}`}
          >
            <span
              className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-all ${enabled ? "left-3" : "left-0.5"}`}
            />
          </span>
        </button>
      </div>
      {enabled &&
        suggestions.map((s) => (
          <SuggestionCard key={`${s.id}-${s.year}`} teamId={teamId} s={s} />
        ))}
    </div>
  );
}

function SuggestionCard({ teamId, s }: { teamId: string; s: Suggestion }) {
  const router = useRouter();
  const [planning, setPlanning] = useState(!!s.planning);
  const [confirm, setConfirm] = useState(false);
  const [later, setLater] = useState(false);
  const [error, setError] = useState("");
  const [gone, setGone] = useState(false);
  const [, start] = useTransition();
  if (gone) return null;

  const respond = (status: "planning" | "hidden" | null) =>
    start(async () => {
      await createClient().rpc("respond_special_event", {
        p_team_id: teamId,
        p_event_id: s.id,
        p_year: s.year,
        p_status: status,
      });
      router.refresh();
    });
  const shown = { ...s, planning, ...countsFor(s, planning) };
  const laterOptions = [
    { days: 1, label: "Tomorrow" },
    { days: 7, label: "Next week" },
    { days: 14, label: "In 2 weeks" },
    { days: 28, label: "In 4 weeks" },
  ].filter((o) => o.days < s.days);
  const planLater = (days: number) => {
    // 6am that day, the same time other actions show up.
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(6, 0, 0, 0);
    setError("");
    start(async () => {
      const { data } = await createClient().rpc("plan_special_event_later", {
        p_team_id: teamId,
        p_event_id: s.id,
        p_year: s.year,
        p_show_from: d.toISOString(),
      });
      if (data !== "ok") return setError("Couldn't move that. Try again?");
      setGone(true);
      router.refresh();
    });
  };

  return (
    <div className="relative rounded-2xl border border-dashed border-stone-300 bg-white/50 p-4">
      {!confirm && (
        <button
          type="button"
          aria-label={`Hide ${s.name}`}
          title="Hide this suggestion"
          onClick={() => setConfirm(true)}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-lg leading-none text-stone-400 hover:bg-stone-100 hover:text-navy"
        >
          ×
        </button>
      )}
      <p className="pr-8 text-xs font-medium text-stone-500">
        <span className="mr-1.5 rounded-full bg-yellow/60 px-2 py-0.5 font-semibold text-navy">
          Suggested
        </span>
        {shortDate(s.date)} · {whenLabel(s.days)}
      </p>
      <p className="mt-1.5 font-semibold text-navy/80">
        {s.emoji && <span className="mr-1.5">{s.emoji}</span>}
        {s.name}
      </p>
      {s.blurb && <p className="mt-0.5 text-sm text-stone-500">{s.blurb}</p>}
      <p className="mt-2 text-xs text-stone-500">{onBoardLine(shown)}</p>

      {later ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-stone-600">
            Put &ldquo;Plan your {s.name}&rdquo; in Actions:
          </span>
          {laterOptions.map((o) => (
            <button
              key={o.days}
              type="button"
              onClick={() => planLater(o.days)}
              className="rounded-lg px-2.5 py-1 font-medium text-navy ring-1 ring-black/10 hover:bg-stone-50"
            >
              {o.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setLater(false)}
            className="rounded-lg px-2 py-1 text-stone-500 hover:bg-stone-100"
          >
            Cancel
          </button>
          {error && <p className="w-full text-red-700">{error}</p>}
        </div>
      ) : confirm ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-stone-600">Hide this until next year?</span>
          <button
            type="button"
            onClick={() => {
              setGone(true);
              respond("hidden");
            }}
            className="rounded-lg bg-navy px-3 py-1 font-semibold text-white"
          >
            Hide
          </button>
          <button
            type="button"
            onClick={() => setConfirm(false)}
            className="rounded-lg px-3 py-1 text-stone-500 hover:bg-stone-100"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {planning ? (
            <>
              <span className="text-sm font-semibold text-pink-ink">
                You&apos;re on board
              </span>
              <a
                href={NEW_EVENT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-stone-500 hover:text-navy hover:underline"
              >
                Create it on activism.wtf ↗
              </a>
              <button
                type="button"
                onClick={() => {
                  setPlanning(false);
                  respond(null);
                }}
                className="text-xs text-stone-400 hover:text-navy hover:underline"
              >
                Undo
              </button>
            </>
          ) : (
            <a
              href={NEW_EVENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                setPlanning(true);
                respond("planning");
              }}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-pink-ink ring-1 ring-pink/50 hover:bg-pink/10"
            >
              Plan it
            </a>
          )}
          {!planning && laterOptions.length > 0 && (
            <button
              type="button"
              onClick={() => setLater(true)}
              className="text-sm text-stone-500 hover:text-navy hover:underline"
            >
              Plan later
            </button>
          )}
          {s.link && (
            <a
              href={s.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-stone-500 hover:text-navy hover:underline"
            >
              More about it ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// Keeps the "on board" counts right straight after tapping Plan it / Undo.
function countsFor(s: Suggestion, planning: boolean) {
  const was = !!s.planning;
  const diff = planning === was ? 0 : planning ? 1 : -1;
  return {
    region_count: s.region_count + diff,
    world_count: s.world_count + diff,
  };
}
