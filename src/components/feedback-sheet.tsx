"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { getFeedback, type FeedbackResponse } from "@/app/actions";

const SCALE = ["Not great", "Meh", "OK", "Good", "Loving it"];

// "Volunteer feedback collected": a message with the form link to post in the
// community chat, and what people have said.
export function FeedbackSheet({
  teamId,
  className,
}: {
  teamId: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"ask" | "responses">("ask");
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getFeedback>
  > | null>(null);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  async function show(which: "ask" | "responses") {
    setTab(which);
    setOpen(true);
    const d = await getFeedback(teamId);
    setData(d);
    const link = d.token ? `${window.location.origin}/feedback/${d.token}` : "";
    setText(
      `Hey everyone, we'd love to hear how volunteering with us has been for you. It's 3 quick questions and you can leave your name off if you like. Every answer gets read and helps us make things better:\n${link}\n\nThanks heaps!`,
    );
  }

  const count = data?.responses.length ?? 0;
  const btn =
    "rounded-xl px-3 py-1.5 text-sm font-semibold ring-1 ring-black/10 hover:bg-stone-50";
  return (
    <>
      <button type="button" onClick={() => show("ask")} className={className}>
        Ask for feedback
      </button>
      <button
        type="button"
        onClick={() => show("responses")}
        className="text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline"
      >
        See responses
      </button>
      {open && (
        <Sheet title="Volunteer feedback" onClose={() => setOpen(false)}>
          <div className="flex gap-1.5">
            {(["ask", "responses"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${tab === t ? "bg-navy text-white ring-navy" : "bg-white text-stone-600 ring-stone-300"}`}
              >
                {t === "ask" ? "Ask" : `Responses${data ? ` (${count})` : ""}`}
              </button>
            ))}
          </div>
          {!data ? (
            <p className="mt-4 text-sm text-stone-500">Loading…</p>
          ) : tab === "ask" ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-stone-600">
                Post this in your community chat. Tweak it if you like.
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={7}
                className="w-full rounded-xl bg-white p-3 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="rounded-xl bg-navy px-3 py-1.5 text-sm font-semibold text-white"
                >
                  {copied ? "Copied ✓" : "Copy message"}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(text)}`}
                  target="_blank"
                  rel="noreferrer"
                  className={btn}
                >
                  Send in WhatsApp
                </a>
                {data.whatsappUrl && (
                  <a
                    href={data.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={btn}
                  >
                    Open community chat
                  </a>
                )}
              </div>
              <p className="text-xs text-stone-500">
                Send in WhatsApp lets you pick the chat with the message ready.
                Or copy it, open the community chat and paste.
              </p>
            </div>
          ) : count === 0 ? (
            <p className="mt-4 text-sm text-stone-500">
              No responses yet. They show here as people fill in the form.
            </p>
          ) : (
            <Responses list={data.responses} />
          )}
        </Sheet>
      )}
    </>
  );
}

function Responses({ list }: { list: FeedbackResponse[] }) {
  const rated = list.filter((r) => r.rating);
  const avg = rated.length
    ? rated.reduce((n, r) => n + r.rating!, 0) / rated.length
    : null;
  return (
    <div className="mt-3 space-y-3">
      {avg !== null && (
        <p className="text-sm text-stone-600">
          Average: <b>{SCALE[Math.round(avg) - 1]}</b> ({avg.toFixed(1)} out of
          5, from {rated.length})
        </p>
      )}
      <ul className="space-y-2">
        {list.map((r) => (
          <li
            key={r.id}
            className="rounded-xl bg-white p-3 text-sm ring-1 ring-black/10"
          >
            <p className="text-xs text-stone-400">
              {r.name ?? "Anonymous"} ·{" "}
              {new Date(r.created_at).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {r.rating ? ` · ${SCALE[r.rating - 1]}` : ""}
            </p>
            {r.going_well && (
              <p className="mt-1.5">
                <span className="font-medium">Working well: </span>
                {r.going_well}
              </p>
            )}
            {r.better && (
              <p className="mt-1">
                <span className="font-medium">Make it better: </span>
                {r.better}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
