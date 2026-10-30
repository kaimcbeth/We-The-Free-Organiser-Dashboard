"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sheet } from "@/components/sheet";
import { createClient } from "@/lib/supabase/client";
import { OpenFeedback } from "@/app/me/open-feedback";

const card = "rounded-2xl bg-white p-4 text-navy shadow-sm ring-1 ring-black/5";
const small =
  "rounded-lg px-2.5 py-1 text-xs font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50";

// Resources: organisers' own feedback for their Regional Support Lead, and the
// link members use to give the organisers feedback (copy or share it).
export function FeedbackCards({ teamId }: { teamId: string | null }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    let live = true;
    createClient()
      .rpc("team_feedback_token", { p_team_id: teamId })
      .then(({ data }) => {
        if (live && data)
          setLink(`${window.location.origin}/tell/${data as string}`);
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
      {teamId && link && (
        <div className={`mt-3 ${card}`}>
          <p className="font-semibold">
            <span aria-hidden className="mr-1.5">
              📣
            </span>
            Member feedback form
          </p>
          <p className="text-sm text-stone-600">
            A link for members to give the organisers feedback, any time. One
            box, name optional. You&apos;ll get a notification for each one.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={copy} className={small}>
              {copied ? "Copied" : "Copy link"}
            </button>
            <button type="button" onClick={share} className={small}>
              Share
            </button>
            <Link
              href="/feedback-inbox"
              className="ml-auto text-xs font-medium text-stone-500 hover:text-navy hover:underline"
            >
              What they&apos;ve said →
            </Link>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`mt-3 flex w-full items-center justify-between text-left hover:ring-pink ${card}`}
      >
        <span>
          <span className="block font-semibold">
            <span aria-hidden className="mr-1.5">
              📢
            </span>
            Feedback for your Regional Support Lead
          </span>
          <span className="block text-sm text-stone-600">
            How organising is going, what you need, ideas. With your name or
            anonymously.
          </span>
        </span>
        <span aria-hidden className="text-xl">
          →
        </span>
      </button>
      {open && (
        <Sheet
          title="Feedback for your Regional Support Lead"
          onClose={() => setOpen(false)}
        >
          <OpenFeedback
            rpc="send_organiser_feedback"
            intro="Anything you'd like your Regional Support Lead to know: how organising is going, what would help, ideas, worries. Every message gets read."
            to="Your Regional Support Lead"
          />
        </Sheet>
      )}
    </>
  );
}
