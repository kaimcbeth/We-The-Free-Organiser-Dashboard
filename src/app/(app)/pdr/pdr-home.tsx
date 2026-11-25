"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/sheet";
import {
  KIND_LABEL,
  METRICS,
  STATUS_LABEL,
  STATUS_STYLE,
  defaultKindYear,
  formatMeeting,
  type OrgGoal,
  type PdrKind,
  type PdrSummary,
} from "@/lib/pdr";
import { GoalBars } from "./goal-bars";

export type Person = {
  id: string;
  name: string;
  email: string;
  region_id: string | null;
  region: string | null;
};
export type Region = { id: string; name: string };
export type Reviewer = {
  id: string;
  name: string;
  email: string;
  access: string;
  on: boolean;
};

const input =
  "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm";
const chip = (on: boolean) =>
  `rounded-full px-3 py-1.5 text-sm font-medium ring-1 ${
    on
      ? "bg-navy text-white ring-navy"
      : "bg-white text-navy ring-stone-300 hover:bg-stone-50"
  }`;

export function PdrHome({
  pdrs,
  reviewer,
  people,
  regions,
  reviewers,
  goals,
  notReady,
}: {
  pdrs: PdrSummary[];
  reviewer: boolean;
  people: Person[];
  regions: Region[];
  reviewers: Reviewer[];
  goals: Record<number, OrgGoal[]>;
  notReady: boolean;
}) {
  const [starting, setStarting] = useState(false);
  const open = pdrs.filter((p) => p.status !== "signed");
  const done = pdrs.filter((p) => p.status === "signed");
  const years = Object.keys(goals).map(Number);

  if (notReady)
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-navy">PDRs</h1>
        <p className="mt-3 rounded-2xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
          PDRs aren&apos;t switched on yet. They&apos;ll be here as soon as the
          database update is approved.
        </p>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">
            {reviewer ? "RSL PDRs" : "Your PDRs"}
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Performance & Development Reviews: a supportive conversation about
            the year, how you&apos;re going and what&apos;s next.
          </p>
        </div>
        {reviewer && (
          <button
            onClick={() => setStarting(true)}
            className="rounded-xl bg-pink px-4 py-2 text-sm font-semibold text-navy hover:bg-pink-strong"
          >
            Start a PDR
          </button>
        )}
      </div>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">
          {reviewer ? "Under way" : "Open"}
        </h2>
        {open.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-stone-300 px-4 py-5 text-center text-sm text-stone-500">
            {reviewer
              ? "No PDRs under way. Press Start a PDR to send one to an RSL."
              : "Nothing to fill in right now. Your community manager will start your next PDR."}
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {open.map((p) => (
              <PdrRow key={p.id} p={p} reviewer={reviewer} />
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">
            Signed off
          </h2>
          <ul className="mt-2 space-y-2">
            {done.map((p) => (
              <PdrRow key={p.id} p={p} reviewer={reviewer} />
            ))}
          </ul>
        </section>
      )}

      {reviewer && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">
            Organisational goals
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Shown at the top of every PDR for that year. Goals linked to the Hub
            fill in their progress by themselves.
          </p>
          <div className="mt-2 space-y-3">
            {years.map((y) => (
              <GoalsEditor key={y} year={y} initial={goals[y]} />
            ))}
          </div>
        </section>
      )}

      {reviewer && reviewers.length > 0 && (
        <ReviewerSwitches list={reviewers} />
      )}

      {starting && (
        <StartSheet
          people={people}
          regions={regions}
          onClose={() => setStarting(false)}
        />
      )}
    </div>
  );
}

function PdrRow({ p, reviewer }: { p: PdrSummary; reviewer: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copyInvite() {
    const link = `${window.location.origin}/pdr-invite/${p.invite_token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", link);
    }
  }
  return (
    <li className="relative rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 hover:ring-navy/30">
      <Link
        href={`/pdr/${p.id}`}
        className="absolute inset-0 rounded-2xl"
        aria-label={`Open ${p.reviewee_name}'s PDR`}
      />
      <div className="pointer-events-none flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-navy">
            {reviewer ? p.reviewee_name : `${KIND_LABEL[p.kind]} ${p.year}`}
            {reviewer && p.region && (
              <span className="ml-1.5 text-sm font-normal text-stone-500">
                · {p.region}
              </span>
            )}
          </p>
          <p className="text-sm text-stone-600">
            {reviewer && `${KIND_LABEL[p.kind]} ${p.year} · `}
            {formatMeeting(p.meeting_at, p.timezone)}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[p.status]}`}
        >
          {STATUS_LABEL[p.status]}
        </span>
      </div>
      {reviewer && p.status === "invited" && p.invite_token && (
        <p className="relative mt-2 text-xs text-stone-500">
          {p.invite_sent_at ? "Invite emailed. " : "Invite email on its way. "}
          <button
            onClick={copyInvite}
            className="font-medium text-pink-ink hover:underline"
          >
            {copied ? "Copied" : "Copy the invite link"}
          </button>
        </p>
      )}
    </li>
  );
}

function StartSheet({
  people,
  regions,
  onClose,
}: {
  people: Person[];
  regions: Region[];
  onClose: () => void;
}) {
  const router = useRouter();
  const d = defaultKindYear();
  const [who, setWho] = useState<string>(people[0]?.id ?? "new");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState("");
  const [kind, setKind] = useState<PdrKind>(d.kind);
  const [year, setYear] = useState(d.year);
  const [meeting, setMeeting] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isNew = who === "new";

  async function start() {
    setError("");
    if (isNew && (!name.trim() || !email.trim() || !region))
      return setError("Add their name, email and region.");
    setBusy(true);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { data, error } = await createClient().rpc("pdr_start", {
      p_kind: kind,
      p_year: year,
      p_person: isNew ? null : who,
      p_name: isNew ? name : null,
      p_email: isNew ? email : null,
      p_region: isNew ? region : null,
      p_meeting: meeting ? new Date(meeting).toISOString() : null,
      p_timezone: tz,
    });
    setBusy(false);
    if (error) return setError(error.message);
    router.push(`/pdr/${data as string}`);
  }

  return (
    <Sheet title="Start a PDR" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <span className="text-sm font-medium text-navy">Who for?</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {people.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setWho(p.id)}
                className={chip(who === p.id)}
              >
                {p.name}
                {p.region && <span className="opacity-70"> · {p.region}</span>}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setWho("new")}
              className={chip(isNew)}
            >
              Someone new
            </button>
          </div>
        </div>
        {isNew && (
          <div className="space-y-3 rounded-2xl bg-stone-50 p-3">
            <p className="text-xs text-stone-600">
              They don&apos;t need a Hub account yet. The email invites them to
              make one, and they become the RSL for this region.
            </p>
            <label className="block">
              <span className="text-sm font-medium text-navy">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={input}
                placeholder="First and last name"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-navy">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={input}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-navy">Region</span>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className={input}
              >
                <option value="">Pick a region</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <div>
          <span className="text-sm font-medium text-navy">Which review?</span>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {(["annual", "mid_year"] as PdrKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={chip(kind === k)}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-sm"
            >
              {[d.year - 1, d.year, d.year + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-navy">Meeting</span>
          <input
            type="datetime-local"
            value={meeting}
            onChange={(e) => setMeeting(e.target.value)}
            className={input}
          />
          <span className="mt-1 block text-xs text-stone-500">
            They get a reminder 3 days before if their draft isn&apos;t in yet.
            You can set or change it later.
          </span>
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button
          onClick={start}
          disabled={busy}
          className="w-full rounded-xl bg-pink px-4 py-3 text-base font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
        >
          {busy ? "Starting…" : "Start and email them"}
        </button>
      </div>
    </Sheet>
  );
}

function GoalsEditor({ year, initial }: { year: number; initial: OrgGoal[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<OrgGoal[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function set(i: number, patch: Partial<OrgGoal>) {
    setRows((r) => r.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  }
  async function save() {
    setBusy(true);
    setError("");
    const goals = rows
      .filter((g) => g.label.trim())
      .map((g) => ({
        label: g.label.trim(),
        target: g.target,
        metric: g.metric || null,
      }));
    const { error } = await createClient().rpc("pdr_set_goals", {
      p_year: year,
      p_goals: goals,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-navy">{year}</h3>
        {!editing && (
          <button
            onClick={() => {
              setRows(initial);
              setEditing(true);
            }}
            className="text-sm font-medium text-pink-ink hover:underline"
          >
            Edit
          </button>
        )}
      </div>
      {!editing ? (
        initial.length ? (
          <GoalBars goals={initial} />
        ) : (
          <p className="mt-1 text-sm text-stone-500">No goals set yet.</p>
        )
      ) : (
        <div className="mt-2 space-y-2">
          {rows.map((g, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_5.5rem] gap-2 sm:grid-cols-[1fr_5.5rem_11rem_auto]"
            >
              <input
                value={g.label}
                onChange={(e) => set(i, { label: e.target.value })}
                placeholder="Goal"
                className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
              />
              <input
                inputMode="numeric"
                value={g.target ?? ""}
                onChange={(e) =>
                  set(i, {
                    target: e.target.value
                      ? Number(e.target.value.replace(/\D/g, ""))
                      : null,
                  })
                }
                placeholder="Target"
                className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
              />
              <select
                value={g.metric ?? ""}
                onChange={(e) => set(i, { metric: e.target.value || null })}
                className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
              >
                {METRICS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setRows((r) => r.filter((_, j) => j !== i))}
                className="text-sm text-stone-400 hover:text-red-700"
                aria-label="Remove goal"
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              setRows((r) => [...r, { label: "", target: null, metric: null }])
            }
            className="text-sm font-medium text-pink-ink hover:underline"
          >
            + Add a goal
          </button>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={save}
              disabled={busy}
              className="rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewerSwitches({ list }: { list: Reviewer[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function toggle(r: Reviewer) {
    setError("");
    const { error } = await createClient().rpc("pdr_set_reviewer", {
      p_user: r.id,
      p_on: !r.on,
    });
    if (error) return setError(error.message);
    router.refresh();
  }
  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">
        Who runs PDRs
      </h2>
      <p className="mt-1 text-sm text-stone-600">
        Only accounts with this switch can see and run RSL PDRs. Hand it to the
        next community manager when the role changes.
      </p>
      <ul className="mt-2 divide-y divide-stone-100 rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        {list.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 px-4 py-2.5"
          >
            <span className="text-sm">
              <span className="font-medium text-navy">{r.name}</span>
              <span className="text-stone-500"> · {r.email}</span>
            </span>
            <button
              role="switch"
              aria-checked={r.on}
              onClick={() => toggle(r)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${r.on ? "bg-pink" : "bg-stone-300"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${r.on ? "left-[22px]" : "left-0.5"}`}
              />
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </section>
  );
}
