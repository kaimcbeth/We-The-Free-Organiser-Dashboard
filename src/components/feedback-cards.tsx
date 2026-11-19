"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sheet } from "@/components/sheet";
import { createClient } from "@/lib/supabase/client";
import { OpenFeedback } from "@/app/me/open-feedback";

const card =
  "rounded-2xl bg-white px-4 py-3 text-navy shadow-sm ring-1 ring-black/5";
const small =
  "rounded-lg px-3 py-1.5 text-sm font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50";

// Resources: organisers' own feedback for their Regional Support Lead, and the
// link members use to give the organisers feedback (copy or share it).
export function FeedbackCards({ teamId }: { teamId: string | null }) {
  const [open, setOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
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
        <button
          type="button"
          onClick={() => setLinkOpen(true)}
          className={`flex h-full w-full items-center justify-between text-left hover:ring-pink ${card}`}
        >
          <span>
            <span className="block font-semibold">
              <span aria-hidden className="mr-1.5">
                📣
              </span>
              Member feedback form
            </span>
            <span className="block text-sm text-stone-600">
              A link for members to send you feedback, any time.
            </span>
          </span>
          <span aria-hidden className="text-xl">
            →
          </span>
        </button>
      )}
      {linkOpen && (
        <Sheet title="Member feedback form" onClose={() => setLinkOpen(false)}>
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
        className={`flex h-full w-full items-center justify-between text-left hover:ring-pink ${card}`}
      >
        <span>
          <span className="block font-semibold">
            <span aria-hidden className="mr-1.5">
              📢
            </span>
            Feedback for We The Free Global Support
          </span>
          <span className="block text-sm text-stone-600">
            Tell us how organising is going.
          </span>
        </span>
        <span aria-hidden className="text-xl">
          →
        </span>
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
