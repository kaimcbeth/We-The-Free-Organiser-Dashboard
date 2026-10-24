"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/sheet";
import { createClient } from "@/lib/supabase/client";

// Social media copy for an event, written by AI in the community's voice.
// Shows a few options per place; you pick, tweak and copy. Never posts.

export type CopyPlatform = "instagram" | "facebook" | "whatsapp" | "story";

const PLACES: { id: CopyPlatform; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook groups" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "story", label: "Story" },
];

type Example = { id: string; platform: string | null; body: string };

function Option({ text }: { text: string }) {
  const [value, setValue] = useState(text);
  const [copied, setCopied] = useState(false);
  return (
    <li className="rounded-xl bg-white p-3 ring-1 ring-black/10">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={Math.min(10, Math.max(2, Math.ceil(value.length / 55)))}
        className="w-full resize-y bg-transparent text-sm leading-relaxed text-stone-800 focus:outline-none"
      />
      <div className="mt-1 flex justify-end gap-2">
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            type="button"
            onClick={() => navigator.share({ text: value }).catch(() => {})}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-stone-500 hover:text-stone-800"
          >
            Share
          </button>
        )}
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded-lg bg-navy px-2.5 py-1 text-xs font-semibold text-white"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
    </li>
  );
}

function VoiceExamples({ teamId }: { teamId: string }) {
  const [list, setList] = useState<Example[] | null>(null);
  const [draft, setDraft] = useState("");
  const [platform, setPlatform] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    createClient()
      .from("voice_examples")
      .select("id, platform, body")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setList((data as Example[]) ?? []));
  }, [teamId]);

  async function add() {
    setError("");
    const body = draft.trim();
    if (body.length < 20)
      return setError("Paste a whole post (at least a sentence or two).");
    if (body.length > 1500)
      return setError("That's a long one. Keep it under 1,500 characters.");
    const { data, error: e } = await createClient()
      .from("voice_examples")
      .insert({ team_id: teamId, body, platform: platform || null })
      .select("id, platform, body")
      .single();
    if (e) return setError("Couldn't add it. You can have up to 10 examples.");
    setList([data as Example, ...(list ?? [])]);
    setDraft("");
  }

  async function remove(id: string) {
    await createClient().from("voice_examples").delete().eq("id", id);
    setList((l) => (l ?? []).filter((x) => x.id !== id));
  }

  const n = list?.length ?? 0;
  return (
    <div className="mt-2 space-y-3 rounded-xl bg-stone-50 p-3 ring-1 ring-black/5">
      <p className="text-xs text-stone-600">
        Paste a few posts your community has written before, ones that sound
        like you. The writer copies their tone, length and emoji habits. Up to
        10, and they&apos;re shared with your community&apos;s organisers and
        Core Team.
      </p>
      {n < 10 && (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            placeholder="Paste a past post…"
            className="w-full rounded-lg bg-white p-2 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-cyan"
          />
          <div className="flex items-center gap-2">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="rounded-lg bg-white px-2 py-1 text-xs ring-1 ring-black/10"
            >
              <option value="">Any place</option>
              {PLACES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={add}
              className="rounded-lg bg-navy px-3 py-1 text-xs font-semibold text-white"
            >
              Add example
            </button>
            <span className="ml-auto text-xs text-stone-400">{n}/10</span>
          </div>
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
      )}
      {(list ?? []).map((x) => (
        <div
          key={x.id}
          className="rounded-lg bg-white p-2 text-xs text-stone-600 ring-1 ring-black/5"
        >
          <p className="line-clamp-3 whitespace-pre-line">{x.body}</p>
          <div className="mt-1 flex justify-between text-stone-400">
            <span>
              {PLACES.find((p) => p.id === x.platform)?.label ?? "Any place"}
            </span>
            <button
              type="button"
              onClick={() => remove(x.id)}
              className="hover:text-stone-700 hover:underline"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CopyMaker({
  eventId,
  teamId,
  past,
  initial = ["instagram", "facebook", "whatsapp"],
  label = "Write post",
  className = "text-xs font-medium text-pink-ink hover:underline",
}: {
  eventId: string;
  teamId: string;
  past: boolean; // after the event: share how it went + invite to the next one
  initial?: CopyPlatform[];
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [places, setPlaces] = useState<Set<CopyPlatform>>(new Set(initial));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<Record<string, string[]> | null>(null);
  const [round, setRound] = useState(0);
  const [showVoice, setShowVoice] = useState(false);

  async function write() {
    setError("");
    setBusy(true);
    const { data, error: e } = await createClient().functions.invoke(
      "write-copy",
      {
        body: { eventId, platforms: [...places], note },
      },
    );
    setBusy(false);
    let msg = data?.error as string | undefined;
    if (!msg && e && "context" in e) {
      try {
        msg = (await (e.context as Response).json()).error;
      } catch {}
    }
    if (e || msg)
      return setError(msg ?? "Couldn't write that. Please try again.");
    setOptions(data.options);
    setRound((r) => r + 1);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      {open && (
        <Sheet
          title={past ? "Post about how it went" : "Post about this event"}
          onClose={() => setOpen(false)}
        >
          <p className="text-sm text-stone-600">
            {past
              ? "Shares how it went and invites people to your next event."
              : "Invites people to come along."}{" "}
            You pick, tweak and post it yourself.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {PLACES.map((p) => {
              const on = places.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    const n = new Set(places);
                    if (on) n.delete(p.id);
                    else n.add(p.id);
                    setPlaces(n);
                  }}
                  className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${on ? "bg-navy text-white ring-navy" : "bg-white text-stone-600 ring-stone-300"}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <label className="mt-3 block text-sm font-medium text-stone-700">
            {past ? "Best moment from the day?" : "Anything special this time?"}{" "}
            <span className="font-normal text-stone-400">(optional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={
                past
                  ? "e.g. a guy who'd never thought about it said he'd try a week vegan"
                  : "e.g. new spot this time, or bring a friend"
              }
              className="mt-1 w-full rounded-xl bg-white p-2 text-sm font-normal ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
            />
          </label>
          <button
            type="button"
            disabled={busy || places.size === 0}
            onClick={write}
            className="mt-3 w-full rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
          >
            {busy ? "Writing…" : options ? "Write new options" : "Write it"}
          </button>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

          {options &&
            PLACES.filter((p) => options[p.id]?.length).map((p) => (
              <section key={`${p.id}-${round}`} className="mt-4">
                <h3 className="mb-1.5 text-sm font-semibold">{p.label}</h3>
                <ul className="space-y-2">
                  {options[p.id].map((t, i) => (
                    <Option key={i} text={t} />
                  ))}
                </ul>
              </section>
            ))}

          <button
            type="button"
            onClick={() => setShowVoice(!showVoice)}
            className="mt-4 text-xs font-medium text-stone-500 hover:text-stone-800 hover:underline"
          >
            {showVoice
              ? "Hide voice examples ▴"
              : "Sound more like us: add examples of our voice ▾"}
          </button>
          {showVoice && <VoiceExamples teamId={teamId} />}
        </Sheet>
      )}
    </>
  );
}
