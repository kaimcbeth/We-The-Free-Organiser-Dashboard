"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { getFeedback, type FeedbackResponse } from "@/app/actions";
import { Option, VoiceExamples } from "@/components/copy-maker";
import { createClient } from "@/lib/supabase/client";

// Ready-made messages (work without the writing assistant).
const PRESETS = (link: string) => [
  `Hey everyone, we'd love to hear how volunteering with us has been for you. It's 3 quick questions and you can leave your name off if you like. Every answer gets read and helps us make things better:\n${link}\n\nThanks heaps!`,
  `Quick one: how are you finding things? We're always trying to make our events better, and the best people to ask are you lot. 2 minutes, name optional:\n${link}`,
  `Got a spare couple of minutes? Tell us what's working and what we could do better. Honest answers welcome, and you don't have to put your name on it.\n${link}`,
];

const SCALE = ["Not great", "Meh", "OK", "Good", "Loving it"];

// "Volunteer feedback collected": a message with the form link to post in the
// community chat, and what people have said.
export function FeedbackSheet({
  teamId,
  className,
  review = false,
}: {
  teamId: string;
  className?: string;
  review?: boolean; // "Feedback reviewed": straight to the responses
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"ask" | "responses">("ask");
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getFeedback>
  > | null>(null);
  const [link, setLink] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showVoice, setShowVoice] = useState(false);

  async function write() {
    setError("");
    setBusy(true);
    const { data: d, error: e } = await createClient().functions.invoke(
      "write-copy",
      { body: { purpose: "feedback", teamId, link, note } },
    );
    setBusy(false);
    let msg = d?.error as string | undefined;
    if (!msg && e && "context" in e) {
      try {
        msg = (await (e.context as Response).json()).error;
      } catch {}
    }
    if (e || msg)
      return setError(msg ?? "Couldn't write that. Please try again.");
    setOptions(d.options);
    setRound((r) => r + 1);
  }

  async function show(which: "ask" | "responses") {
    setTab(which);
    setOpen(true);
    const d = await getFeedback(teamId);
    setData(d);
    const l = d.token ? `${window.location.origin}/feedback/${d.token}` : "";
    setLink(l);
    if (!options.length) setOptions(PRESETS(l));
  }

  const count = data?.responses.length ?? 0;
  const btn =
    "rounded-xl px-3 py-1.5 text-sm font-semibold ring-1 ring-black/10 hover:bg-stone-50";
  return (
    <>
      {review ? (
        <button
          type="button"
          onClick={() => show("responses")}
          className={className}
        >
          Read responses
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => show("ask")}
            className={className}
          >
            Ask for feedback
          </button>
          <button
            type="button"
            onClick={() => show("responses")}
            className="text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline"
          >
            See responses
          </button>
        </>
      )}
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
                Pick one, tweak it, copy it and post it in your community chat.
              </p>
              {data.whatsappUrl && (
                <a
                  href={data.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-block ${btn}`}
                >
                  Open community chat
                </a>
              )}
              <ul key={round} className="space-y-2">
                {options.map((t, i) => (
                  <Option key={i} text={t} />
                ))}
              </ul>
              <label className="block text-sm font-medium text-stone-700">
                Anything to mention?{" "}
                <span className="font-normal text-stone-400">(optional)</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. we're thinking about changing the time of Saturday outreach"
                  className="mt-1 w-full rounded-xl bg-white p-2 text-sm font-normal ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
                />
              </label>
              <button
                type="button"
                disabled={busy || !link}
                onClick={write}
                className="w-full rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
              >
                {busy ? "Writing…" : "Write new options"}
              </button>
              {error && <p className="text-sm text-red-700">{error}</p>}
              <button
                type="button"
                onClick={() => setShowVoice(!showVoice)}
                className="text-xs font-medium text-stone-500 hover:text-stone-800 hover:underline"
              >
                {showVoice
                  ? "Hide voice examples ▴"
                  : "Sound more like us: add examples of our voice ▾"}
              </button>
              {showVoice && <VoiceExamples teamId={teamId} />}
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
            {r.message && (
              <p className="mt-1.5 whitespace-pre-line">{r.message}</p>
            )}
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
