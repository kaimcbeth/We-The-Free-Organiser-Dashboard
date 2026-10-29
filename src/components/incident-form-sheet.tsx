"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { Option, VoiceExamples } from "@/components/copy-maker";
import { createClient } from "@/lib/supabase/client";
import { INCIDENT_FORM_URL } from "@/lib/resources";

// Ready-made messages (work without the writing assistant).
const PRESETS = [
  `Hey everyone, just a quick reminder: if anything ever goes wrong at one of our events (harassment, someone getting hurt, trouble with the public or police), you can let us know with our incident report form and we'll follow it up:\n${INCIDENT_FORM_URL}\n\nYou can always talk to one of the organisers too.`,
  `Friendly heads-up, nothing's happened! We have an incident report form for anything at an event that doesn't feel right. It's there to look after everyone:\n${INCIDENT_FORM_URL}`,
  `Something we like to share every now and then: if you ever have a bad experience at an event, please tell us. You can use this form or just message an organiser.\n${INCIDENT_FORM_URL}`,
];

// "Incident report form shared": a message with the form link for the
// community chat, with a "Write new options" button.
export function IncidentFormSheet({
  teamId,
  className,
}: {
  teamId: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<string[]>(PRESETS);
  const [round, setRound] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showVoice, setShowVoice] = useState(false);
  const [chat, setChat] = useState<string | null>(null);

  async function show() {
    setOpen(true);
    const { data } = await createClient()
      .from("teams")
      .select("whatsapp_url")
      .eq("id", teamId)
      .maybeSingle<{ whatsapp_url: string | null }>();
    setChat(data?.whatsapp_url ?? null);
  }

  async function write() {
    setError("");
    setBusy(true);
    const { data: d, error: e } = await createClient().functions.invoke(
      "write-copy",
      { body: { purpose: "incident", teamId, note } },
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

  return (
    <>
      <button type="button" onClick={show} className={className}>
        Write message
      </button>
      {open && (
        <Sheet title="Incident report form" onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <p className="text-sm text-stone-600">
              Pick one, tweak it, copy it and post it in your community chat.
            </p>
            {chat && (
              <a
                href={chat}
                target="_blank"
                rel="noreferrer"
                className="inline-block rounded-xl px-3 py-1.5 text-sm font-semibold ring-1 ring-black/10 hover:bg-stone-50"
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
                placeholder="e.g. Ash and Priya are the people to talk to at events"
                className="mt-1 w-full rounded-xl bg-white p-2 text-sm font-normal ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
              />
            </label>
            <button
              type="button"
              disabled={busy}
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
        </Sheet>
      )}
    </>
  );
}
