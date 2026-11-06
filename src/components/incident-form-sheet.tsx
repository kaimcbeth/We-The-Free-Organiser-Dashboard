"use client";

import { useState } from "react";
import { ORGANISER_QUESTIONS } from "@/lib/organiser-questions";
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
  return (
    <ChatMessageSheet
      teamId={teamId}
      className={className}
      purpose="incident"
      title="Incident report form"
      presets={PRESETS}
      placeholder="e.g. Ash and Priya are the people to talk to at events"
    />
  );
}

// A message for the community chat: ready-made options, plus "Write new
// options" (write-copy with the given purpose, in the community's voice).
export function ChatMessageSheet({
  teamId,
  className,
  purpose,
  extra = {},
  title,
  presets,
  label = "Write message",
  placeholder,
  canWrite = true,
  intro = "Pick one, tweak it, copy it and post it in your community chat.",
}: {
  teamId: string | null;
  className?: string;
  purpose: string;
  extra?: Record<string, string>;
  title: string;
  presets: string[];
  label?: string;
  placeholder: string;
  canWrite?: boolean; // false: ready-made options only (no write-copy purpose)
  intro?: string; // the line at the top of the sheet
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<string[]>(presets);
  const [round, setRound] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showVoice, setShowVoice] = useState(false);
  const [chat, setChat] = useState<string | null>(null);

  async function show() {
    setOpen(true);
    if (!teamId) return;
    const { data } = await createClient()
      .from("teams")
      .select("whatsapp_url")
      .eq("id", teamId)
      .maybeSingle<{ whatsapp_url: string | null }>();
    setChat(data?.whatsapp_url ?? null);
  }

  async function write() {
    if (!teamId) return setError("Pick a community first.");
    setError("");
    setBusy(true);
    const { data: d, error: e } = await createClient().functions.invoke(
      "write-copy",
      { body: { ...extra, purpose, teamId, note } },
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
        {label}
      </button>
      {open && (
        <Sheet title={title} onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <p className="text-sm text-stone-600">{intro}</p>
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
            {canWrite && (
              <>
                <label className="block text-sm font-medium text-stone-700">
                  Anything to mention?{" "}
                  <span className="font-normal text-stone-400">(optional)</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder={placeholder}
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
                {showVoice && teamId && <VoiceExamples teamId={teamId} />}
              </>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}

const MENTAL_HEALTH_URL = "https://activism.wtf/mental-health";
const MENTAL_HEALTH_PRESETS = [
  `Hey everyone 💛 Caring about animals can weigh on you, and burnout and compassion fatigue are really common in our movement. We The Free has put together a mental health kit for activists: a free 24/7 support line run by counsellors who are animal advocates themselves, a free burnout course (code WTF), support groups and more:\n${MENTAL_HEALTH_URL}\n\nAnd you can always reach out to any of us.`,
  `A gentle reminder to look after yourselves 🌱 If activism is feeling heavy lately, there are free resources made for people like us, from a 24/7 activist support line to meditation apps and a course on avoiding burnout:\n${MENTAL_HEALTH_URL}`,
  `Quick check-in: how's everyone going? Sustainable activism means looking after your own wellbeing too. Here's We The Free's mental health first aid kit for activists, with support lines, support groups, therapists who get it, and more:\n${MENTAL_HEALTH_URL}\n\nIf you're in crisis, please contact your local emergency services or a crisis line.`,
];

// "Mental health resources shared" (quarterly): a caring message with the
// activism.wtf/mental-health link for the community chat.
export function MentalHealthSheet({
  teamId,
  className,
}: {
  teamId: string;
  className?: string;
}) {
  return (
    <ChatMessageSheet
      teamId={teamId}
      className={className}
      purpose="mental_health"
      title="Mental health resources"
      presets={MENTAL_HEALTH_PRESETS}
      placeholder="e.g. mention our next potluck as a chance to connect"
    />
  );
}

// "After-party host asked for" (special events, 0181): ready-made messages
// asking if someone can offer their place for an after party.
export function AfterPartySheet({
  teamId,
  event,
  when,
  className,
  label,
}: {
  teamId: string;
  event: string;
  when: string; // e.g. "Fri 25 Dec"
  className?: string;
  label?: string;
}) {
  const name = event.replace(/^WTF[:\s-]*/i, "").trim() || "our special event";
  return (
    <ChatMessageSheet
      teamId={teamId}
      className={className}
      purpose="afterparty"
      title="After-party host"
      label={label}
      canWrite={false}
      placeholder=""
      presets={[
        `Hey everyone! 🎉 ${name} is coming up on ${when}, and we'd love to keep the good times going afterwards with an after party. Does anyone have a place they'd be happy to host at? Nothing fancy needed, just somewhere to hang out, share some vegan food and celebrate together. Reply here or message one of the organisers 💛`,
        `Calling all hosts! 🏡 We're looking for someone who'd be up for hosting a relaxed after party following ${name} on ${when}. We'll help with food, setting up and cleaning up. Backyard, balcony or living room, it all works. Let us know if you can!`,
        `A little ask for ${name} (${when}) 🙌 Would anyone like to open up their place for an after party? Think bring-a-plate and good company. If you can, just reply here and we'll sort the details together.`,
      ]}
    />
  );
}

// Discussion questions for the weekly organiser group chat post (RSL action
// rsl_weekly_post; Kai, 6 Nov 2026).
export function OrganiserQuestionsSheet({ className }: { className?: string }) {
  return (
    <ChatMessageSheet
      teamId={null}
      className={className}
      purpose="organiser_questions"
      title="Discussion questions"
      label="Discussion questions"
      presets={ORGANISER_QUESTIONS}
      placeholder=""
      canWrite={false}
      intro="Pick a question, tweak it, copy it and post it in the organiser group chat."
    />
  );
}
