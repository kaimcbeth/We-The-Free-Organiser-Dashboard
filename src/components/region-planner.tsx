"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/sheet";
import { HoursSlider, fmtHours } from "@/components/hours-slider";
import { createClient } from "@/lib/supabase/client";
import {
  KIND_COLUMNS,
  MIN_WEEK_MINUTES,
  byImportance,
  toSetupKind,
  type KindRow,
  type SetupKind,
} from "@/lib/task-setup";

// Plan RSL actions (Kai, 6 Nov 2026): like Plan actions for organisers, for
// a Regional Support Lead's own actions. A slider from 2 to 50 hours a week
// suggests which ones to take on; each can be switched on or off. Saved per
// region (0201: region_task_kinds, regions.rsl_week_minutes).

export const RSL_MAX_MINUTES = 50 * 60;
const DEFAULT_MINUTES = 10 * 60;

type Plan = {
  minutes: number | null;
  communities: number;
  enabled: Record<string, boolean>;
};

// Minutes a week an RSL action takes. Monthly ones made for each community
// (like organiser check-ins) count once per community; hangout promotion is
// about three reminders per monthly hangout.
export function rslWeeklyMinutes(k: RslKind, communities: number) {
  if (k.perCommunity) return k.estimate * communities * 0.25;
  return k.estimate * (k.timesPerWeek ?? 0.75);
}

type RslKind = SetupKind & { perCommunity: boolean };

function suggest(kinds: RslKind[], minutes: number, communities: number) {
  const on = new Set<string>();
  let used = 0;
  for (const k of [...kinds].sort(byImportance)) {
    const cost = rslWeeklyMinutes(k, communities);
    if (k.tier === 1 || used + cost <= minutes) {
      on.add(k.kind);
      used += cost;
    }
  }
  return on;
}

export function RegionPlanner({
  regionId,
  regionName,
}: {
  regionId: string;
  regionName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-navy ring-1 ring-stone-300 hover:bg-stone-50"
      >
        Plan RSL actions
      </button>
      {open && (
        <PlannerSheet
          regionId={regionId}
          regionName={regionName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function PlannerSheet({
  regionId,
  regionName,
  onClose,
}: {
  regionId: string;
  regionName?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [kinds, setKinds] = useState<RslKind[] | null>(null);
  const [communities, setCommunities] = useState(0);
  const [minutes, setMinutes] = useState(DEFAULT_MINUTES);
  const [on, setOn] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    const supabase = createClient();
    Promise.all([
      supabase
        .from("task_kinds")
        .select(KIND_COLUMNS)
        .is("archived_at", null)
        .is("team_id", null)
        .eq("audience", "regional")
        .order("sort_order"),
      supabase.rpc("region_action_plan", { p_region: regionId }),
    ]).then(([k, p]) => {
      if (!live) return;
      if (k.error || p.error) {
        setError("Couldn't load your RSL actions. Try again in a moment.");
        setKinds([]);
        return;
      }
      const rows = (k.data ?? []) as unknown as KindRow[];
      const list: RslKind[] = rows.map((r) => ({
        ...toSetupKind(r),
        perCommunity: r.schedule !== "special",
      }));
      const plan = p.data as Plan;
      setKinds(list);
      setCommunities(plan.communities);
      setMinutes(plan.minutes ?? DEFAULT_MINUTES);
      setOn(
        new Set(
          list
            .filter((x) => plan.enabled[x.kind] ?? x.defaultOn)
            .map((x) => x.kind),
        ),
      );
    });
    return () => {
      live = false;
    };
  }, [regionId]);

  const cost = (k: RslKind) => rslWeeklyMinutes(k, communities);
  const total = useMemo(
    () =>
      (kinds ?? [])
        .filter((k) => on.has(k.kind))
        .reduce((n, k) => n + cost(k), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cost depends on communities only
    [kinds, on, communities],
  );

  async function save() {
    setSaving(true);
    setError("");
    const { error } = await createClient().rpc("set_region_action_plan", {
      p_region: regionId,
      p_on: [...on],
      p_minutes: minutes,
    });
    setSaving(false);
    if (error) {
      setError("Couldn't save. Try again in a moment.");
      return;
    }
    router.refresh();
    onClose();
  }

  const sorted = (kinds ?? []).slice().sort(byImportance);
  return (
    <Sheet title="Plan RSL actions" onClose={onClose}>
      {!kinds ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-sm text-stone-600">
              How much time do you have each week for your Regional Support Lead
              work{regionName ? ` in ${regionName}` : ""}?
            </p>
            <div className="mt-3">
              <HoursSlider
                value={minutes}
                max={RSL_MAX_MINUTES}
                onChange={setMinutes}
                min={MIN_WEEK_MINUTES}
                maxLabel={fmtHours(RSL_MAX_MINUTES)}
                label="Hours a week for RSL work"
                everything={false}
              />
            </div>
            <button
              type="button"
              onClick={() => setOn(suggest(kinds, minutes, communities))}
              className="mt-3 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-2"
            >
              Suggest my actions
            </button>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-navy">Your actions</h3>
              <span className="text-xs text-stone-500">
                About {fmtHours(Math.round(total))} a week
                {total > minutes && (
                  <span className="text-[#b91c1c]"> · more than you have</span>
                )}
              </span>
            </div>
            <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
              {sorted.map((k) => {
                const checked = on.has(k.kind);
                return (
                  <li key={k.kind}>
                    <button
                      type="button"
                      onClick={() =>
                        setOn((s) => {
                          const n = new Set(s);
                          if (n.has(k.kind)) n.delete(k.kind);
                          else n.add(k.kind);
                          return n;
                        })
                      }
                      aria-pressed={checked}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-stone-50"
                    >
                      <span
                        className={`relative mt-0.5 h-5 w-8 shrink-0 rounded-full transition-colors ${checked ? "bg-cyan" : "bg-stone-300"}`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-3.5" : "left-0.5"}`}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-navy">
                          {k.title}
                        </span>
                        <span className="block text-xs text-stone-500">
                          {k.perCommunity
                            ? `${k.label} min a month for each of your ${communities} communities`
                            : k.kind === "promote_hangout"
                              ? `${k.label} min, about 3 times for each hangout`
                              : `${k.label} min each time`}
                          {k.blurb ? ` · ${k.blurb}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-stone-500">
                        ~{Math.round(cost(k))} min/wk
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-stone-400">
              More RSL actions are on the way.
            </p>
          </div>

          {error && <p className="text-sm text-[#b91c1c]">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-pink px-4 py-2 text-sm font-semibold text-navy disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
