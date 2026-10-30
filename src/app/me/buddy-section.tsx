"use client";

import { useState, useTransition } from "react";
import {
  claimNewcomer,
  completePrompt,
  setNotifyChannel,
} from "@/app/buddy-actions";
import { enablePush } from "@/lib/push-client";
import { formatEventDate, formatTime, nowIso } from "@/lib/time";
import { waLink } from "@/lib/whatsapp-link";

type Prompt = {
  id: string;
  kind: string;
  due_at: string;
  done_at: string | null;
};
type Pair = {
  pairing_id: string;
  since: string;
  newcomer: {
    id: string;
    first_name: string;
    last_name: string | null;
    phone: string | null; // shared only with whoever is supporting them
  };
  events: number;
  last_seen: string | null;
  prompts: Prompt[];
};
type Available = {
  id: string;
  first_name: string;
  last_name: string | null;
  first_event_title: string;
  first_event_at: string;
};
type Upcoming = {
  id: string;
  title: string;
  starts_at: string;
  venue: string | null;
  url: string | null;
  type: string | null;
};
export type BuddyDashboard = {
  status: "ok" | "no_profile";
  is_buddy: boolean;
  notify_channel: "none" | "email" | "push";
  pairs: Pair[];
  available: Available[];
  upcoming_events: Upcoming[];
};

const full = (p: { first_name: string; last_name: string | null }) =>
  [p.first_name, p.last_name].filter(Boolean).join(" ");

function inviteText(first: string, e: Upcoming, tz: string) {
  const where = e.venue ? ` at ${e.venue}` : "";
  return `Hey ${first}! We've got ${e.title}${where} on ${formatEventDate(e.starts_at, tz)}, ${formatTime(e.starts_at, tz)}. Want to come along?${
    e.url ? ` ${e.url}` : ""
  }`;
}

export function BuddySection({
  data,
  tz,
}: {
  data: BuddyDashboard;
  tz: string; // the team's time zone
}) {
  if (!data.is_buddy && data.pairs.length === 0) return null;

  return (
    <section id="buddies" className="mt-8 scroll-mt-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
        New member support
      </h2>
      {data.pairs.length === 0 ? (
        <p className="text-sm text-stone-500">
          No one yet. Pick a newcomer below, or an organiser will pair you up.
        </p>
      ) : (
        <ul className="space-y-3">
          {data.pairs.map((p) => (
            <PairCard
              tz={tz}
              key={p.pairing_id}
              pair={p}
              upcoming={data.upcoming_events}
            />
          ))}
        </ul>
      )}

      {data.is_buddy && <Available tz={tz} people={data.available} />}
      {/* Reminders: one setting for everything, under Coming up. */}
    </section>
  );
}

function PairCard({
  pair,
  upcoming,
  tz,
}: {
  pair: Pair;
  upcoming: Upcoming[];
  tz: string;
}) {
  const n = pair.newcomer;
  const [now] = useState(nowIso);
  const due = pair.prompts.find(
    (pr) => !pr.done_at && Date.parse(pr.due_at) <= Date.parse(now),
  );
  const later = pair.prompts.find(
    (pr) => !pr.done_at && Date.parse(pr.due_at) > Date.parse(now),
  );
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [pick, setPick] = useState(upcoming[0]?.id ?? "");
  const [copied, setCopied] = useState(false);
  const event = upcoming.find((e) => e.id === pick);
  const text = event ? inviteText(n.first_name, event, tz) : "";

  async function share() {
    if (!text) return;
    if ("share" in navigator) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* fall back to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this message:", text);
    }
  }

  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <p className="font-medium">{full(n)}</p>
      <p className="text-sm text-stone-500">
        Supporting since {formatEventDate(pair.since, tz)} · {pair.events}{" "}
        {pair.events === 1 ? "event" : "events"}
        {pair.last_seen
          ? ` · last seen ${formatEventDate(pair.last_seen, tz)}`
          : ""}
      </p>
      <Contact person={n} tz={tz} />

      {due && !done ? (
        <div className="mt-3 rounded-xl bg-yellow/30 p-3">
          <p className="font-semibold text-navy">
            Invite {n.first_name} to an upcoming event
          </p>
          {upcoming.length === 0 ? (
            <p className="mt-1 text-sm text-stone-600">
              No upcoming events yet. Check back soon.
            </p>
          ) : (
            <>
              <select
                value={pick}
                onChange={(e) => setPick(e.target.value)}
                aria-label="Event"
                className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
              >
                {upcoming.map((e) => (
                  <option key={e.id} value={e.id}>
                    {formatEventDate(e.starts_at, tz)}: {e.title}
                  </option>
                ))}
              </select>
              <p className="mt-2 rounded-xl bg-white p-3 text-sm text-stone-700">
                {text}
              </p>
            </>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={share}
              disabled={!text}
              className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-navy ring-1 ring-stone-300 hover:bg-stone-50 disabled:opacity-40"
            >
              {copied ? "Copied" : "Send message…"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await completePrompt(due.id);
                  if (r.error) setError(r.error);
                  else setDone(true);
                })
              }
              className="rounded-xl bg-pink px-3 py-2 text-sm font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
            >
              {pending ? "Saving…" : "Done, invited"}
            </button>
          </div>
          {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
        </div>
      ) : done ? (
        <p className="mt-2 text-sm font-medium text-stone-600">
          Nice one. Thanks for reaching out!
        </p>
      ) : later ? (
        <p className="mt-2 text-sm text-stone-500">
          We&apos;ll remind you to invite {n.first_name} to an event on{" "}
          {formatEventDate(later.due_at, tz)}.
        </p>
      ) : null}
    </li>
  );
}

function Available({ people, tz }: { people: Available[]; tz: string }) {
  const [claimed, setClaimed] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const list = people.filter((p) => !claimed.includes(p.id));

  return (
    <div className="mt-6">
      <h3 className="mb-2 font-semibold">New members needing support</h3>
      {list.length === 0 ? (
        <p className="text-sm text-stone-500">
          Every new member has support right now.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {list.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 border-b border-black/5 px-4 py-3 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{full(p)}</p>
                <p className="truncate text-sm text-stone-500">
                  First came to {p.first_event_title},{" "}
                  {formatEventDate(p.first_event_at, tz)}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await claimNewcomer(p.id);
                    if (r.error) setError(r.error);
                    else {
                      setError("");
                      setClaimed((c) => [...c, p.id]);
                    }
                  })
                }
                className="shrink-0 rounded-xl bg-pink px-3 py-2 text-sm font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
              >
                I&apos;ll support them
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}

const CHANNELS = [
  { value: "email", label: "Email" },
  { value: "push", label: "Phone notification" },
  { value: "none", label: "Nothing else" },
] as const;

export function ReminderSetting({
  initial,
  hasEmail,
  intro = "You always get them in the app (the bell). Also send them by:",
  bare = false,
  dryRun = false,
}: {
  initial: BuddyDashboard["notify_channel"];
  hasEmail: boolean;
  intro?: string;
  bare?: boolean; // no card or heading (inside the welcome tour)
  dryRun?: boolean; // God Mode preview: don't save anything
}) {
  const [channel, setChannel] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  function choose(next: BuddyDashboard["notify_channel"]) {
    if (next === channel) return;
    if (dryRun) {
      setChannel(next);
      return;
    }
    start(async () => {
      if (next === "email" && !hasEmail) {
        setMsg("Add your email in your profile (your photo, top right) first.");
        return;
      }
      if (next === "push") {
        const err = await enablePush();
        if (err) {
          setMsg(err);
          return;
        }
      }
      const r = await setNotifyChannel(next);
      if (r.error) setMsg(r.error);
      else {
        setChannel(next);
        setMsg(
          next === "push"
            ? "Done. You'll get reminders on this device."
            : "Saved.",
        );
      }
    });
  }

  return (
    <div
      className={
        bare
          ? "mt-4 text-left"
          : "mt-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
      }
    >
      {!bare && <h3 className="font-semibold">Reminders</h3>}
      <p className="text-sm text-stone-500">{intro}</p>
      <div
        className="mt-3 grid grid-cols-3 gap-2"
        role="radiogroup"
        aria-label="Also remind me by"
      >
        {CHANNELS.map((c) => (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={channel === c.value}
            disabled={pending}
            onClick={() => choose(c.value)}
            className={`rounded-xl px-2 py-2 text-sm font-semibold ring-1 disabled:opacity-60 ${
              channel === c.value
                ? "bg-navy text-white ring-navy"
                : "bg-white text-navy ring-stone-300 hover:bg-stone-50"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {msg && <p className="mt-2 text-sm text-stone-600">{msg}</p>}
    </div>
  );
}

// Get in touch with them: WhatsApp (opens an empty chat), call, or save them
// to your phone's contacts.
function Contact({ person, tz }: { person: Pair["newcomer"]; tz: string }) {
  const btn =
    "rounded-lg px-2.5 py-1 text-xs font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50";
  if (!person.phone)
    return (
      <p className="mt-2 text-xs text-stone-400">
        No phone number for {person.first_name} yet. Ask an organiser.
      </p>
    );
  const wa = waLink(person.phone, tz);
  function saveContact() {
    const name = [person.first_name, person.last_name]
      .filter(Boolean)
      .join(" ");
    const card = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${name}`,
      `N:${person.last_name ?? ""};${person.first_name};;;`,
      `TEL;TYPE=CELL:${person.phone}`,
      "NOTE:We The Free",
      "END:VCARD",
    ].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([card], { type: "text/vcard" }));
    a.download = `${name.replace(/[^a-z0-9]+/gi, "-")}.vcf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  }
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className={btn}>
          WhatsApp
        </a>
      )}
      <button type="button" onClick={saveContact} className={btn}>
        Save contact
      </button>
    </div>
  );
}
