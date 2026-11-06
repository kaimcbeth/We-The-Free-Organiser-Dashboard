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

type How = "community" | "weekly" | "monthly";
const HOW: [How, string][] = [
  ["community", "Each community, every month"],
  ["weekly", "Every week"],
  ["monthly", "Every month"],
];

// Minutes a week an RSL action takes. Monthly ones made for each community
// (like organiser check-ins) count once per community; hangout promotion is
// about three reminders per monthly hangout.
export function rslWeeklyMinutes(k: RslKind, communities: number) {
  // Monthly unless the kind says otherwise (quarterly = 1/13 a week).
  if (k.perCommunity)
    return k.estimate * communities * (k.timesPerWeek ?? 0.25);
  return k.estimate * (k.timesPerWeek ?? 0.75);
}

type RslKind = SetupKind & {
  perCommunity: boolean;
  own: boolean; // added by this region's RSL (0203), can be removed
};

function toRslKind(r: KindRow & { region_id?: string | null }): RslKind {
  const base = toSetupKind(r);
  return {
    ...base,
    perCommunity: ![
      "special",
      "region_weekly",
      "region_monthly",
      "region_quarterly",
    ].includes(r.schedule),
    timesPerWeek:
      r.schedule === "region_weekly"
        ? 1
        : r.schedule === "region_monthly"
          ? 0.25
          : r.schedule === "region_quarterly"
            ? 1 / 13
            : base.timesPerWeek,
    own: !!r.region_id,
  };
}

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
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{
    title: string;
    minutes: number;
    how: How;
  }>({ title: "", minutes: 15, how: "community" });
  const [busy, setBusy] = useState(false);

  async function addOwn() {
    if (!draft.title.trim()) {
      setError("Give the action a name.");
      return;
    }
    setBusy(true);
    setError("");
    const { data, error } = await createClient().rpc("add_region_task", {
      p_region: regionId,
      p_title: draft.title.trim(),
      p_minutes: draft.minutes,
      p_how: draft.how,
    });
    setBusy(false);
    if (error || !data) {
      setError("Couldn't add the action. Try again in a moment.");
      return;
    }
    const kind = data as string;
    const schedule =
      draft.how === "community"
        ? "monthly"
        : draft.how === "weekly"
          ? "region_weekly"
          : "region_monthly";
    setKinds((all) => [
      ...(all ?? []),
      toRslKind({
        kind,
        title: draft.title.trim(),
        blurb: null,
        estimate_minutes: draft.minutes,
        estimate_max_minutes: null,
        anchor: "start",
        due_after_hours: 0,
        team_id: null,
        schedule,
        default_enabled: true,
        outreach_only: false,
        needs_team_newcomers: false,
        needs_newcomers: false,
        importance: null,
        tier: null,
        event_type: null,
        region_id: regionId,
      }),
    ]);
    setOn((o) => new Set(o).add(kind));
    setDraft({ title: "", minutes: 15, how: "community" });
    setAdding(false);
    router.refresh();
  }

  async function removeOwn(k: RslKind) {
    if (!confirm(`Remove "${k.title}"? Any still open are closed too.`)) return;
    const { data, error } = await createClient().rpc("remove_region_task", {
      p_kind: k.kind,
    });
    if (error || !data) {
      setError("Couldn't remove it. Try again in a moment.");
      return;
    }
    setKinds((all) => (all ?? []).filter((x) => x.kind !== k.kind));
    setOn((o) => {
      const n = new Set(o);
      n.delete(k.kind);
      return n;
    });
    router.refresh();
  }

  useEffect(() => {
    let live = true;
    const supabase = createClient();
    Promise.all([
      supabase
        .from("task_kinds")
        .select(`${KIND_COLUMNS}, region_id`)
        .is("archived_at", null)
        .is("team_id", null)
        .eq("audience", "regional")
        .or(`region_id.is.null,region_id.eq.${regionId}`)
        .order("sort_order"),
      supabase.rpc("region_action_plan", { p_region: regionId }),
    ]).then(([k, p]) => {
      if (!live) return;
      if (k.error || p.error) {
        setError("Couldn't load your RSL actions. Try again in a moment.");
        setKinds([]);
        return;
      }
      const rows = (k.data ?? []) as unknown as (KindRow & {
        region_id: string | null;
      })[];
      const list: RslKind[] = rows.map(toRslKind);
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
                            ? `${k.label} min ${k.when === "quarterly" ? "every 3 months" : "a month"} for each of your ${communities} communities`
                            : k.kind === "promote_hangout"
                              ? `${k.label} min, about 3 times for each hangout`
                              : `${k.label} min ${k.timesPerWeek === 1 ? "every week" : k.timesPerWeek === 0.25 ? "every month" : "every 3 months"}`}
                          {k.blurb ? ` · ${k.blurb}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-stone-500">
                        ~{Math.round(cost(k))} min/wk
                      </span>
                    </button>
                    {k.own && (
                      <button
                        type="button"
                        onClick={() => removeOwn(k)}
                        className="-mt-2 mb-2 ml-15 text-xs text-stone-400 hover:text-[#b91c1c] hover:underline"
                      >
                        Remove this action
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {adding ? (
              <div className="mt-3 space-y-3 rounded-2xl bg-white p-4 ring-2 ring-pink/60">
                <p className="text-sm font-semibold text-navy">
                  Your own action
                </p>
                <input
                  autoFocus
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                  onKeyDown={(e) => e.key === "Enter" && addOwn()}
                  placeholder="e.g. Organiser hangout planned"
                  aria-label="Action name"
                  maxLength={80}
                  className="block w-full rounded-lg bg-white px-3 py-2 text-sm text-navy ring-1 ring-stone-300 placeholder:text-stone-400"
                />
                <div>
                  <p className="mb-1.5 text-xs font-medium text-stone-500">
                    How often
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {HOW.map(([v, label]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setDraft({ ...draft, how: v })}
                        aria-pressed={draft.how === v}
                        className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                          draft.how === v
                            ? "bg-navy text-white ring-navy"
                            : "bg-white text-stone-500 ring-stone-300"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-medium text-stone-500">
                  About
                  <input
                    type="number"
                    min={1}
                    max={600}
                    value={draft.minutes}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        minutes: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className="w-20 rounded-lg bg-white px-2 py-1 text-sm text-navy ring-1 ring-stone-300"
                  />
                  minutes
                  {draft.how === "community"
                    ? " for each community"
                    : " each time"}
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAdding(false)}
                    className="rounded-xl px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={addOwn}
                    disabled={busy}
                    className="rounded-xl bg-navy px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {busy ? "Adding…" : "Add action"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="mt-3 text-sm font-semibold text-pink-ink hover:underline"
              >
                + Add your own action
              </button>
            )}
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
