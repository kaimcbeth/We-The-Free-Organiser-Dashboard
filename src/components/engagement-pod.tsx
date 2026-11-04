"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/sheet";
import { createClient } from "@/lib/supabase/client";
import { inputClass } from "@/components/form";

// The engagement pod (0180): members who said yes to "Engage with our posts".
// Organisers and Core Team share a Facebook post here; every pod member gets
// a "Post liked and commented on" action with the link.

type PodPost = {
  id: string;
  url: string;
  note: string | null;
  by: string | null;
  at: string;
  sent: number;
  done: number;
};
type Overview = { chat: string | null; members: string[]; posts: PodPost[] };

const isFacebook = (u: string) =>
  /^https?:\/\/([a-z0-9-]+\.)*(facebook\.com|fb\.com|fb\.watch|fb\.me)(\/|$)/i.test(
    u.trim(),
  );

function ago(at: string) {
  const h = Math.floor((Date.now() - Date.parse(at)) / 36e5);
  if (h < 1) return "just now";
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

// The message for the pod's WhatsApp chat (sent by the organiser, to the
// group they pick, not a personal DM).
export function podChatText(url: string, note: string) {
  return [
    note.trim() || "A post to cheer on 🙌",
    url.trim(),
    "Give it a like and a friendly comment in your own words 💬",
  ].join("\n\n");
}

// "Share a post" (the weekly action's button, and the Resources card).
export function PodShareButton({
  teamId,
  canEditChat,
  className,
  label = "Share a post",
  children,
}: {
  teamId: string;
  canEditChat: boolean; // organisers set the pod chat link; Core Team can't
  className?: string;
  label?: string;
  children?: React.ReactNode; // a custom trigger (e.g. a Resources card)
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        data-pod-share
      >
        {children ?? label}
      </button>
      {open && (
        <Sheet title="Engagement pod" onClose={() => setOpen(false)}>
          <PodShare teamId={teamId} canEditChat={canEditChat} />
        </Sheet>
      )}
    </>
  );
}

export function PodShare({
  teamId,
  canEditChat,
  initial,
}: {
  teamId: string;
  canEditChat: boolean;
  initial?: Overview; // for tests
}) {
  const [data, setData] = useState<Overview | null>(initial ?? null);
  const [loaded, setLoaded] = useState(!!initial);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shared, setShared] = useState<{
    url: string;
    note: string;
    sent: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [editChat, setEditChat] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [chatMsg, setChatMsg] = useState("");

  async function load() {
    const { data: d } = await createClient().rpc("pod_overview", {
      p_team_id: teamId,
    });
    setData((d as Overview | null) ?? { chat: null, members: [], posts: [] });
    setLoaded(true);
  }
  useEffect(() => {
    if (initial) return;
    let live = true;
    createClient()
      .rpc("pod_overview", { p_team_id: teamId })
      .then(({ data: d }) => {
        if (!live) return;
        setData(
          (d as Overview | null) ?? { chat: null, members: [], posts: [] },
        );
        setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, [teamId, initial]);

  async function share() {
    setError("");
    if (!isFacebook(url))
      return setError(
        "That doesn't look like a Facebook link. Open the post, copy its link (… → Copy link) and paste it here.",
      );
    setBusy(true);
    const { data: r, error: e } = await createClient().rpc("share_pod_post", {
      p_team_id: teamId,
      p_url: url.trim(),
      p_note: note,
    });
    setBusy(false);
    const res = r as { id?: string; sent?: number; error?: string } | null;
    if (e || !res || res.error)
      return setError(
        res?.error === "not_facebook"
          ? "That doesn't look like a Facebook link."
          : "Couldn't share that. Please try again.",
      );
    setShared({ url: url.trim(), note, sent: res.sent ?? 0 });
    setUrl("");
    setNote("");
    setCopied(false);
    load();
  }

  async function saveChat() {
    setChatMsg("");
    const { data: r } = await createClient().rpc("set_pod_chat", {
      p_team_id: teamId,
      p_url: chatDraft,
    });
    if (r === "not_whatsapp")
      return setChatMsg(
        "Paste the group's invite link (it starts with https://chat.whatsapp.com/).",
      );
    if (r !== "ok") return setChatMsg("Couldn't save that. Please try again.");
    setEditChat(false);
    load();
  }

  const members = data?.members ?? [];
  const chat = data?.chat ?? null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        Spotted a post by someone from your community in a vegan Facebook group,
        like a newcomer&apos;s first post? Share it here and everyone in the pod
        gets an action to like it and leave a friendly comment.
      </p>

      {shared ? (
        <div className="space-y-3 rounded-2xl bg-cyan/15 p-4 ring-1 ring-cyan">
          <p className="font-semibold text-navy">
            {shared.sent === 0
              ? "Shared. Nobody else is in the pod yet, so no actions were sent."
              : `Sent to ${shared.sent} ${shared.sent === 1 ? "person" : "people"} in the pod.`}
          </p>
          <p className="text-sm text-stone-600">
            Want it in the pod&apos;s WhatsApp chat too? Copy the message, then
            paste it in the chat.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    podChatText(shared.url, shared.note),
                  );
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold text-navy ${copied ? "bg-cyan" : "bg-pink hover:bg-pink-strong"}`}
            >
              {copied ? "Copied" : "Copy message"}
            </button>
            {chat && (
              <a
                href={chat}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50"
              >
                Open the pod chat ↗
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShared(null)}
            className="text-sm text-stone-500 hover:text-navy hover:underline"
          >
            Share another post
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-stone-700">
            Link to the Facebook post
            <input
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.facebook.com/groups/…"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="block text-sm font-medium text-stone-700">
            A note for the pod{" "}
            <span className="font-normal text-stone-400">(optional)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              placeholder="e.g. Jess's first post, she came to her first Movie Challenge on Saturday"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <button
            type="button"
            disabled={busy || !url.trim()}
            onClick={share}
            className="w-full rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
          >
            {busy ? "Sharing…" : "Share with the pod"}
          </button>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
      )}

      <div className="border-t border-black/5 pt-3 text-sm">
        <p className="font-semibold text-navy">
          In the pod{loaded ? ` (${members.length})` : ""}
        </p>
        {!loaded ? (
          <p className="text-stone-400">Loading…</p>
        ) : members.length ? (
          <p className="text-stone-600">{members.join(", ")}</p>
        ) : (
          <p className="text-stone-600">
            Nobody yet. Members join by saying yes to &ldquo;Engage with our
            posts&rdquo; in How you can help.
          </p>
        )}
        <p className="mt-2 text-stone-600">
          {chat ? (
            <>
              <a
                href={chat}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-navy hover:underline"
              >
                Pod WhatsApp chat ↗
              </a>
              {canEditChat && !editChat && (
                <button
                  type="button"
                  onClick={() => {
                    setChatDraft(chat);
                    setEditChat(true);
                  }}
                  className="ml-3 text-xs text-stone-400 hover:text-navy hover:underline"
                >
                  Change
                </button>
              )}
            </>
          ) : (
            canEditChat &&
            !editChat && (
              <button
                type="button"
                onClick={() => {
                  setChatDraft("");
                  setEditChat(true);
                }}
                className="text-xs text-stone-400 hover:text-navy hover:underline"
              >
                Add the pod&apos;s WhatsApp chat link
              </button>
            )
          )}
        </p>
        {editChat && (
          <div className="mt-2 space-y-2">
            <input
              value={chatDraft}
              onChange={(e) => setChatDraft(e.target.value)}
              placeholder="https://chat.whatsapp.com/…"
              className={inputClass}
            />
            <p className="text-xs text-stone-500">
              Pod members see a &ldquo;Join the pod chat&rdquo; link. Leave it
              blank to remove it.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={saveChat}
                className="rounded-xl bg-navy px-3 py-1.5 text-sm font-semibold text-white"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditChat(false)}
                className="text-sm text-stone-500 hover:underline"
              >
                Cancel
              </button>
            </div>
            {chatMsg && <p className="text-sm text-red-700">{chatMsg}</p>}
          </div>
        )}
      </div>

      {!!data?.posts.length && (
        <div className="border-t border-black/5 pt-3 text-sm">
          <p className="font-semibold text-navy">Last two weeks</p>
          <ul className="mt-1 space-y-2">
            {data.posts.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 text-stone-700 hover:underline"
                >
                  <span className="line-clamp-1">
                    {p.note || "Facebook post"}
                  </span>
                  <span className="block text-xs text-stone-400">
                    {ago(p.at)}
                    {p.by ? ` · ${p.by}` : ""}
                  </span>
                </a>
                <span className="shrink-0 rounded-full bg-navy/5 px-2 py-0.5 text-xs font-semibold text-navy">
                  {p.sent ? `${p.done} of ${p.sent} done` : "No one in the pod"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
