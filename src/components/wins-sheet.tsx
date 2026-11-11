"use client";

// "Find wins" on the share-a-win actions (Kai, 11 Nov 2026): searches the web
// for recent wins for animals in the community's country and writes 3 ready-to-send
// messages with the source link. teamId → the community's member chat;
// regionId → an RSL's organiser chat. Runs write-copy purpose "wins".

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { Option } from "@/components/copy-maker";
import { createClient } from "@/lib/supabase/client";

type Win = {
  headline: string;
  where: string;
  when: string;
  kind: "win" | "progress";
  url: string;
  source: string;
};

export function WinsSheet({
  teamId,
  regionId,
  className,
}: {
  teamId?: string | null;
  regionId?: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [wins, setWins] = useState<Win[] | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const [chat, setChat] = useState<string | null>(null);
  const forOrganisers = !teamId;

  async function find() {
    setError("");
    setBusy(true);
    const { data: d, error: e } = await createClient().functions.invoke(
      "write-copy",
      {
        body: teamId
          ? { purpose: "wins", teamId, note }
          : { purpose: "wins", regionId, note },
      },
    );
    setBusy(false);
    let msg = d?.error as string | undefined;
    if (!msg && e && "context" in e) {
      try {
        msg = (await (e.context as Response).json()).error;
      } catch {}
    }
    if (e || msg)
      return setError(msg ?? "Couldn't find wins right now. Try again.");
    setWins(d.wins ?? []);
    setOptions(d.options ?? []);
    setRound((r) => r + 1);
  }

  async function show() {
    setOpen(true);
    if (!wins && !busy) find();
    if (!teamId) return;
    const { data } = await createClient()
      .from("teams")
      .select("whatsapp_url")
      .eq("id", teamId)
      .maybeSingle<{ whatsapp_url: string | null }>();
    setChat(data?.whatsapp_url ?? null);
  }

  return (
    <>
      <button type="button" onClick={show} className={className}>
        Find wins
      </button>
      {open && (
        <Sheet title="Wins for animals" onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <p className="text-sm text-stone-600">
              Recent good news for animals in your country, found on the web
              just now. Check the link, pick a message, tweak it and post it in
              your {forOrganisers ? "organiser" : "community"} chat.
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
            {busy && (
              <p className="rounded-xl bg-stone-100 p-3 text-sm text-stone-600">
                Searching for recent wins… this can take up to a minute.
              </p>
            )}
            {error && <p className="text-sm text-red-700">{error}</p>}
            {wins && wins.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-stone-500">
                  What it found
                </p>
                <ul className="space-y-1.5">
                  {wins.map((w, i) => (
                    <li key={i} className="text-sm leading-snug">
                      {w.kind === "progress" && (
                        <span className="mr-1.5 rounded-full bg-cyan/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-cyan-800">
                          Step forward
                        </span>
                      )}
                      <span className="font-medium text-navy">
                        {w.headline}
                      </span>
                      <span className="text-stone-500">
                        {" "}
                        · {[w.where, w.when].filter(Boolean).join(", ")} ·{" "}
                        <a
                          href={w.url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:text-stone-800"
                        >
                          {w.source || "source"}
                        </a>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {options.length > 0 && (
              <ul key={round} className="space-y-2">
                {options.map((t, i) => (
                  <Option key={i} text={t} />
                ))}
              </ul>
            )}
            {(wins || error) && !busy && (
              <>
                <label className="block text-sm font-medium text-stone-700">
                  Looking for something in particular?{" "}
                  <span className="font-normal text-stone-400">(optional)</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="e.g. something about greyhounds"
                    className="mt-1 w-full rounded-xl bg-white p-2 text-sm font-normal ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
                  />
                </label>
                <button
                  type="button"
                  onClick={find}
                  className="w-full rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong"
                >
                  Search again
                </button>
              </>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}
