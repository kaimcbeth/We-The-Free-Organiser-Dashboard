"use client";

import { useState, useTransition } from "react";
import { Sheet } from "@/components/sheet";
import { createClient } from "@/lib/supabase/client";
import { setReminderPrefs } from "@/app/buddy-actions";

type Category = "all" | "outreach" | "community";
type Prefs = {
  channel: "none" | "email" | "push";
  going: boolean;
  maybe: boolean;
  upcoming: boolean;
  category: Category;
};
type Settings = {
  notify_channel: Prefs["channel"];
  has_email: boolean;
  going: boolean;
  maybe: boolean;
  upcoming: boolean;
  category: Category;
};

// On = everything, off = nothing (Kai, 4 Nov 2026).
const EVERYTHING = {
  going: true,
  maybe: true,
  upcoming: true,
  category: "all",
} as const;

// "Reminders" (Kai, 4 Nov 2026): a small link in the Events page header that
// opens the reminder settings (moved here from the profile).
export function RemindersLink({
  className = "text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline",
}: {
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<Settings | null>(null);
  const [error, setError] = useState("");

  async function show() {
    setOpen(true);
    setError("");
    const { data, error } = await createClient().rpc("my_reminder_settings");
    if (error) setError("Couldn't load your reminders. Please try again.");
    else if (!data)
      setError(
        "Your account isn't connected to a profile yet, so there's nothing to remind you about.",
      );
    else setS(data as Settings);
  }

  return (
    <>
      <button type="button" onClick={show} className={className}>
        Reminders
      </button>
      {open && (
        <Sheet
          title="Reminders"
          onClose={() => {
            setOpen(false);
            setS(null);
          }}
        >
          {error ? (
            <p className="text-sm text-stone-600">{error}</p>
          ) : !s ? (
            <p className="text-sm text-stone-400">Loading…</p>
          ) : (
            <EmailReminders initial={s} />
          )}
        </Sheet>
      )}
    </>
  );
}

const WHICH = [
  { key: "going", label: "Events I'm going to" },
  { key: "maybe", label: "Events I said maybe to" },
  { key: "upcoming", label: "All upcoming events" },
] as const;

function chip(active: boolean) {
  return `rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition disabled:opacity-60 ${
    active
      ? "bg-navy text-white ring-navy"
      : "bg-white text-stone-500 ring-stone-300 hover:bg-stone-50"
  }`;
}

export function EmailReminders({ initial }: { initial: Settings }) {
  const [p, setP] = useState<Prefs>({
    channel: initial.notify_channel,
    going: initial.going,
    maybe: initial.maybe,
    upcoming: initial.upcoming,
    category: initial.category,
  });
  const on = p.channel === "email";
  const everything = p.going && p.maybe && p.upcoming && p.category === "all";
  const [more, setMore] = useState(on && !everything);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  function save(next: Prefs, note = "Saved.") {
    const before = p;
    setP(next);
    setMsg("");
    start(async () => {
      const r = await setReminderPrefs(next);
      if (r.error) {
        setP(before);
        setMsg(r.error);
      } else setMsg(note);
    });
  }

  function flip() {
    if (on) {
      setMore(false);
      save(
        {
          channel: "none",
          going: true,
          maybe: false,
          upcoming: false,
          category: "all",
        },
        "Email reminders are off.",
      );
    } else if (!initial.has_email) {
      setMsg("Add your email on your profile first (your photo, top right).");
    } else save({ channel: "email", ...EVERYTHING }, "Email reminders are on.");
  }

  // Each row keeps at least one button on.
  function toggleWhich(key: (typeof WHICH)[number]["key"]) {
    const next = { ...p, [key]: !p[key] };
    if (!next.going && !next.maybe && !next.upcoming) {
      setMsg("Keep at least one on, or switch email reminders off.");
      return;
    }
    save(next);
  }
  const outreach = p.category !== "community";
  const community = p.category !== "outreach";
  function toggleType(type: "outreach" | "community") {
    const o = type === "outreach" ? !outreach : outreach;
    const c = type === "community" ? !community : community;
    if (!o && !c) {
      setMsg("Keep at least one on, or switch email reminders off.");
      return;
    }
    save({ ...p, category: o && c ? "all" : o ? "outreach" : "community" });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-navy">Email reminders</p>
          <p className="mt-0.5 text-sm text-stone-500">
            {on
              ? everything
                ? "On: the day before your events, and a heads-up about upcoming ones."
                : "On, fine-tuned below."
              : "Off: no emails."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Email reminders"
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
        <button
          type="button"
          onClick={() => setMore(!more)}
          aria-expanded={more}
          className="mt-3 text-sm text-stone-500 hover:text-stone-800 hover:underline"
        >
          {more ? "Hide fine-tuning" : "Fine-tune"}
        </button>
      )}

      {on && more && (
        <div className="mt-3 space-y-4 rounded-2xl bg-stone-50 p-3">
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
                  className={chip(p[w.key])}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-stone-400">
              Going and maybe: the day before. Upcoming: 3 days before, for
              events you haven&apos;t answered.
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
              Types of events
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={outreach}
                disabled={pending}
                onClick={() => toggleType("outreach")}
                className={chip(outreach)}
              >
                Outreach
              </button>
              <button
                type="button"
                aria-pressed={community}
                disabled={pending}
                onClick={() => toggleType("community")}
                className={chip(community)}
              >
                Community
              </button>
            </div>
            <p className="mt-2 text-xs text-stone-400">
              Outreach: Movie Challenges and other outreach. Community: socials
              and co-working.
            </p>
          </div>
        </div>
      )}

      {msg && <p className="mt-3 text-sm text-stone-600">{msg}</p>}
    </div>
  );
}
