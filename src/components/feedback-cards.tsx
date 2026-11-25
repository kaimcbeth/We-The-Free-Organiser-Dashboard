"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sheet } from "@/components/sheet";
import { createClient } from "@/lib/supabase/client";
import { OpenFeedback } from "@/app/me/open-feedback";
import { RESOURCE_CARD, ResourceCardBody } from "@/components/resource-card";

const small =
  "rounded-lg px-3 py-1.5 text-sm font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50";

const seenKey = (team: string) => `wtf-feedback-seen-${team}`;

export function readFeedbackSeen(team: string): string | null {
  try {
    return localStorage.getItem(seenKey(team));
  } catch {
    return null;
  }
}

export function markFeedbackSeen(team: string) {
  try {
    localStorage.setItem(seenKey(team), new Date().toISOString());
  } catch {
    // Private mode etc.: the badge just won't clear.
  }
}

// Resources: organisers' own feedback for their Regional Support Lead, and the
// link members use to give the organisers feedback (copy or share it).
export function FeedbackCards({ teamId }: { teamId: string | null }) {
  const [open, setOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<{ n: number; latest: string | null }>({
    n: 0,
    latest: null,
  });
  const [fresh, setFresh] = useState(0);

  useEffect(() => {
    if (!teamId) return;
    let live = true;
    const db = createClient();
    db.rpc("team_feedback_token", { p_team_id: teamId }).then(({ data }) => {
      if (live && data)
        setLink(`${window.location.origin}/tell/${data as string}`);
    });
    db.from("volunteer_feedback")
      .select("created_at", { count: "exact" })
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data, count }) => {
        if (live)
          setStats({ n: count ?? 0, latest: data?.[0]?.created_at ?? null });
      });
    // New since this person last opened the responses (Kai, 26 Nov 2026:
    // "a little notification for any new answers"); kept per device.
    const seen = readFeedbackSeen(teamId);
    if (seen === null) markFeedbackSeen(teamId);
    else
      db.from("volunteer_feedback")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId)
        .gt("created_at", seen)
        .then(({ count }) => {
          if (live) setFresh(count ?? 0);
        });
    return () => {
      live = false;
    };
  }, [teamId]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", link);
    }
  }

  async function share() {
    if (!navigator.share) return copy();
    try {
      await navigator.share({
        title: "Feedback for your organisers",
        text: "Got feedback for the organisers? Tell us here (you can leave your name off):",
        url: link,
      });
    } catch {
      // Cancelled, or sharing isn't available: copying still works.
    }
  }

  return (
    <>
      {teamId && (
        // Local member feedback survey (Kai, 26 Nov 2026: "make sure it looks
        // distinct" from the Global Support card): a cyan survey card with
        // the response count and its own two buttons.
        <div className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-cyan/30 via-cyan/10 to-white px-4 py-3 text-navy shadow-sm ring-1 ring-cyan/60 transition hover:ring-cyan">
          {/* The whole card opens the responses (Kai, 26 Nov 2026: no
              "Read responses" button). */}
          <Link
            href="/feedback-inbox"
            aria-label="Read the responses"
            className="absolute inset-0 rounded-2xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -right-4 -top-5 text-7xl opacity-15"
          >
            💬
          </span>
          {fresh > 0 && (
            <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-pink px-2 py-0.5 text-[11px] font-bold text-navy shadow-sm">
              {fresh} new
            </span>
          )}
          <span className="pointer-events-none text-[11px] font-bold uppercase tracking-wider text-cyan-800">
            From your members
          </span>
          <span className="pointer-events-none mt-0.5 font-semibold leading-snug">
            📝 Member feedback survey
          </span>
          <span className="pointer-events-none mt-1 text-sm text-stone-700">
            Your local members tell you how they&apos;re finding things, with or
            without their name.
          </span>
          <span className="pointer-events-none mt-2 text-xs font-medium text-cyan-900">
            {stats.n === 0
              ? "No responses yet"
              : `${stats.n} ${stats.n === 1 ? "response" : "responses"}${
                  stats.latest
                    ? ` · latest ${new Date(stats.latest).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`
                    : ""
                }`}
          </span>
          <span className="relative mt-auto flex flex-wrap gap-2 pt-3">
            <button
              type="button"
              onClick={() => setLinkOpen(true)}
              disabled={!link}
              className="rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-50"
            >
              Share the survey
            </button>
          </span>
        </div>
      )}
      {linkOpen && (
        <Sheet
          title="Member feedback survey"
          onClose={() => setLinkOpen(false)}
        >
          <p className="text-sm text-stone-600">
            Share this link with your members. They can give the organisers
            feedback any time, with or without their name. You&apos;ll get a
            notification for each one.
          </p>
          <p className="mt-3 break-all rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-700">
            {link}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={copy} className={small}>
              {copied ? "Copied" : "Copy link"}
            </button>
            <button type="button" onClick={share} className={small}>
              Share
            </button>
            <Link
              href="/feedback-inbox"
              className="ml-auto text-sm font-medium text-stone-500 hover:text-navy hover:underline"
            >
              What they&apos;ve said →
            </Link>
          </div>
        </Sheet>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={RESOURCE_CARD}
      >
        <ResourceCardBody
          emoji="📢"
          title="Feedback for We The Free Global Support"
          about="Tell us how organising is going."
        />
      </button>
      {open && (
        <Sheet
          title="Feedback for We The Free Global Support"
          onClose={() => setOpen(false)}
        >
          <OpenFeedback
            rpc="send_organiser_feedback"
            intro="Anything you'd like We The Free Global Support to know: how organising is going, what would help, ideas, worries. Every message gets read."
            to="We The Free Global Support"
          />
        </Sheet>
      )}
    </>
  );
}

// On the members' responses page: everything there now counts as seen, so the
// "N new" badge on the survey card clears.
export function MarkFeedbackSeen({ teamId }: { teamId: string }) {
  useEffect(() => {
    markFeedbackSeen(teamId);
  }, [teamId]);
  return null;
}
