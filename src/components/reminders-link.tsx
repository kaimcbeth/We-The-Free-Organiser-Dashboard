"use client";

import { useEffect, useState, useTransition } from "react";
import { Sheet } from "@/components/sheet";
import { createClient } from "@/lib/supabase/client";
import { setReminderPrefs } from "@/app/buddy-actions";

type Prefs = {
  channel: "none" | "email" | "push" | "sms";
  going: boolean;
  upcoming: boolean;
  kinds: string[] | null; // null = every kind
};
type Settings = {
  notify_channel: Prefs["channel"];
  has_email: boolean;
  has_phone?: boolean;
  going: boolean;
  upcoming: boolean;
  kinds: string[] | null;
};

// Kinds of event, worked out from the type and title by `event_kind()`
// (0172), so potlucks, demos etc. count even though activism.wtf doesn't
// type them.
// "Other outreach", "Demonstrations" and "Everything else" left off (Kai,
// 4 Nov 2026); those
// events still come when every button here is on (kinds = null).
const KINDS = [
  {
    key: "movie_challenge",
    label: "Movie Challenges",
  },
  { key: "social", label: "Socials" },
  { key: "potluck", label: "Potlucks & dinners" },
  { key: "coworking", label: "Co-working" },
  {
    key: "workshop",
    label: "Workshops & training",
  },
  { key: "sanctuary", label: "Sanctuary days" },
  { key: "hike", label: "Hikes" },
] as const;
const ALL_KINDS: string[] = KINDS.map((k) => k.key);

// Loads your reminder settings and shows the switch + buttons. Used in the
// Reminders pop-up and as a setup step in every role's introduction.
export function MyReminders({ dryRun = false }: { dryRun?: boolean }) {
  const [s, setS] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    createClient()
      .rpc("my_reminder_settings")
      .then(({ data, error }) => {
        if (!live) return;
        if (error) setError("Couldn't load your reminders. Please try again.");
        else if (!data)
          setError(
            "Your account isn't connected to a profile yet, so there's nothing to remind you about.",
          );
        else setS(data as Settings);
      });
    return () => {
      live = false;
    };
  }, []);
  if (error) return <p className="text-sm text-stone-600">{error}</p>;
  if (!s) return <p className="text-sm text-stone-400">Loading…</p>;
  return (
    <>
      <EmailReminders initial={s} dryRun={dryRun} />
      <PodOptIn dryRun={dryRun} />
    </>
  );
}

// Engagement pod opt-in (Kai, 5 Nov 2026): the same as saying yes to "Engage
// with our posts" in How you can help (0180), so the two stay in step.
export function PodOptIn({ dryRun = false }: { dryRun?: boolean }) {
  const [on, setOn] = useState<boolean | null>(null);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => {
    let live = true;
    createClient()
      .rpc("my_micro_roles")
      .then(({ data }) => {
        if (!live || !data) return;
        const role = (
          data as { roles: { key: string; status: string | null }[] }
        ).roles.find((r) => r.key === "engage_posts");
        setOn(role?.status === "active");
      });
    return () => {
      live = false;
    };
  }, []);
  if (on === null) return null;

  function flip() {
    const next = !on;
    setOn(next);
    setMsg("");
    if (dryRun) return;
    start(async () => {
      const { data, error } = await createClient().rpc(
        next ? "offer_micro_role" : "stop_micro_role",
        { p_key: "engage_posts" },
      );
      if (error || data === "not_allowed" || data === "unknown") {
        setOn(!next);
        setMsg("Couldn't save that. Please try again.");
      }
    });
  }

  return (
    <div className="mt-5 border-t border-black/5 pt-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-navy">Engagement pod</p>
          <p className="mt-0.5 text-sm text-stone-500">
            {on
              ? "You'll get an action when there's a community member's Facebook post to like and comment on."
              : "Get an action when someone from the community (like a newcomer) posts in a vegan Facebook group, to like and comment."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Engagement pod"
          disabled={pending}
          onClick={flip}
          className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${on ? "bg-pink" : "bg-stone-300"}`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`}
          />
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-red-700">{msg}</p>}
    </div>
  );
}

// Monday email summary (Kai, 12 Nov 2026; 0228): organisers only.
export function WeeklySummaryOptIn() {
  const [on, setOn] = useState<boolean | null>(null);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => {
    let live = true;
    createClient()
      .rpc("my_weekly_summary")
      .then(({ data }) => {
        if (live) setOn(data !== false);
      });
    return () => {
      live = false;
    };
  }, []);
  if (on === null) return null;
  function flip() {
    const next = !on;
    setOn(next);
    setMsg("");
    start(async () => {
      const { error } = await createClient().rpc("set_weekly_summary", {
        p_on: next,
      });
      if (error) {
        setOn(!next);
        setMsg("Couldn't save that. Please try again.");
      }
    });
  }
  return (
    <div className="mt-5 border-t border-black/5 pt-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-navy">Monday summary</p>
          <p className="mt-0.5 text-sm text-stone-500">
            An email each Monday morning: last week&apos;s numbers and
            first-timers, this week&apos;s events, actions due and birthdays.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Monday summary"
          disabled={pending}
          onClick={flip}
          className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${on ? "bg-pink" : "bg-stone-300"}`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`}
          />
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-red-700">{msg}</p>}
    </div>
  );
}

// "Reminders" (Kai, 4 Nov 2026): a small link in the Events page header that
// opens the reminder settings (moved here from the profile).
export function RemindersLink({
  className = "text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline",
  organiser = false,
}: {
  className?: string;
  organiser?: boolean; // shows the Monday summary switch
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-tour="reminders-link"
        className={className}
      >
        Reminders
      </button>
      {open && (
        <Sheet title="Reminders" onClose={() => setOpen(false)}>
          <MyReminders />
          {organiser && <WeeklySummaryOptIn />}
        </Sheet>
      )}
    </>
  );
}

const WHICH = [
  { key: "going", label: "Events I'm going to" },
  { key: "upcoming", label: "All upcoming events" },
] as const;

// Selected buttons get a brand colour (Kai, 4 Nov 2026): pink for "Events
// I'm going to", a glowing gradient for "All upcoming events", cyan for event
// types; navy text.
function chip(active: boolean, on = "bg-pink ring-pink") {
  return `rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition disabled:opacity-60 ${
    active
      ? `${on} text-navy`
      : "bg-white text-stone-500 ring-stone-300 hover:bg-stone-50"
  }`;
}

export function EmailReminders({
  initial,
  dryRun = false,
}: {
  initial: Settings;
  dryRun?: boolean; // God Mode previews: nothing is saved
}) {
  const [p, setP] = useState<Prefs>({
    channel: initial.notify_channel,
    going: initial.going,
    upcoming: initial.upcoming,
    kinds: initial.kinds,
  });
  // On = email or text (Kai, 4 Nov 2026: texts through ClickSend).
  const on = p.channel === "email" || p.channel === "sms";
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const kindOn = (k: string) => !p.kinds || p.kinds.includes(k);

  function save(next: Prefs) {
    const before = p;
    setP(next);
    setMsg("");
    if (dryRun) return;
    start(async () => {
      const r = await setReminderPrefs(next);
      if (r.error) {
        setP(before);
        setMsg(r.error);
      }
    });
  }

  function flip() {
    if (on)
      save({ channel: "none", going: true, upcoming: false, kinds: null });
    else if (!initial.has_email && !initial.has_phone)
      setMsg(
        "Add your email or mobile on your profile first (your photo, top right).",
      );
    // On = everything (Kai, 4 Nov 2026), by email if they have one.
    else
      save({
        channel: initial.has_email ? "email" : "sms",
        going: true,
        upcoming: true,
        kinds: null,
      });
  }

  function sendBy(channel: "email" | "sms") {
    if (channel === p.channel) return;
    if (channel === "sms" && !initial.has_phone)
      return setMsg(
        "Add your mobile on your profile first (your photo, top right).",
      );
    if (channel === "email" && !initial.has_email)
      return setMsg(
        "Add your email on your profile first (your photo, top right).",
      );
    save({ ...p, channel });
  }

  // Each row keeps at least one button on.
  function toggleWhich(key: "going" | "upcoming") {
    const next = { ...p, [key]: !p[key] };
    if (!next.going && !next.upcoming) {
      setMsg("Keep at least one on, or switch reminders off.");
      return;
    }
    save(next);
  }
  function toggleKind(k: string) {
    const now = ALL_KINDS.filter(kindOn);
    const next = now.includes(k) ? now.filter((x) => x !== k) : [...now, k];
    if (!next.length) {
      setMsg("Keep at least one on, or switch reminders off.");
      return;
    }
    save({ ...p, kinds: next.length === ALL_KINDS.length ? null : next });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-navy">Send me reminders</p>
          <p className="mt-0.5 text-sm text-stone-500">
            {on
              ? "Choose how and what you hear about below."
              : "Off: no emails or texts."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Reminders"
          disabled={pending}
          onClick={flip}
          className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${on ? "bg-pink" : "bg-stone-300"}`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`}
          />
        </button>
      </div>

      {on && (
        <div className="mt-4 space-y-4 rounded-2xl bg-stone-50 p-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Send by
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["email", "Email"],
                  ["sms", "Text message"],
                ] as const
              ).map(([c, label]) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={p.channel === c}
                  disabled={pending}
                  onClick={() => sendBy(c)}
                  className={chip(
                    p.channel === c,
                    "bg-navy ring-navy !text-white",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Remind me about
            </p>
            <div className="flex flex-wrap gap-2">
              {WHICH.map((w) => (
                <button
                  key={w.key}
                  type="button"
                  aria-pressed={p[w.key]}
                  disabled={pending}
                  onClick={() => toggleWhich(w.key)}
                  className={chip(
                    p[w.key],
                    w.key === "going"
                      ? "bg-pink ring-pink"
                      : // "All upcoming events" feels special (Kai, 4 Nov 2026).
                        "reminder-special bg-linear-to-r from-yellow via-pink to-yellow ring-pink shadow-md shadow-pink/50",
                  )}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-stone-400">
              Going: the day before. Upcoming: 3 days before, for events you
              haven&apos;t answered.
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Types of events
            </p>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <button
                  key={k.key}
                  type="button"
                  aria-pressed={kindOn(k.key)}
                  disabled={pending}
                  onClick={() => toggleKind(k.key)}
                  className={chip(kindOn(k.key), "bg-cyan ring-cyan")}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {msg && <p className="mt-3 text-sm text-stone-600">{msg}</p>}
    </div>
  );
}
