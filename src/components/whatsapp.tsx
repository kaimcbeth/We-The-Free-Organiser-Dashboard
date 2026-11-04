"use client";

import { useState, useTransition } from "react";
import { setTeamWhatsapp } from "@/app/actions";
import { ShareLink } from "@/components/share-link";
import { inputClass } from "@/components/form";
import { createClient } from "@/lib/supabase/client";

export function WhatsAppIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.2Z" />
    </svg>
  );
}

// Big green "Join our WhatsApp community" button for members. With `hideOnceJoined`
// it goes away once they've tapped it (or say they've already joined): we
// can't see who's in the group, so tapping the link counts as joining.
export function WhatsAppJoin({
  url,
  hideOnceJoined = false,
  guidelines = false,
}: {
  url: string;
  hideOnceJoined?: boolean;
  // Go to the guidelines + join page (/me/whatsapp) instead of straight to
  // WhatsApp; joining is counted there.
  guidelines?: boolean;
}) {
  const [hidden, setHidden] = useState(false);
  const joined = () => {
    if (!hideOnceJoined) return;
    createClient()
      .rpc("mark_whatsapp_joined")
      .then(() => {});
  };
  if (hidden) return null;
  const card = (
    <a
      href={guidelines ? "/me/whatsapp" : url}
      target={guidelines ? undefined : "_blank"}
      rel="noopener noreferrer"
      onClick={() => {
        if (guidelines) return;
        joined();
        // Leave it on screen while they're off in WhatsApp; gone next visit.
      }}
      className="flex items-center gap-3 rounded-2xl bg-[#25D366] px-4 py-3.5 font-semibold text-navy shadow-sm hover:brightness-95"
    >
      <WhatsAppIcon className="h-6 w-6 shrink-0" />
      <span className="min-w-0 flex-1">
        Join our WhatsApp community
        <span className="block text-sm font-normal text-navy/75">
          Event updates and chat with the community
        </span>
      </span>
      <span aria-hidden>{guidelines ? "→" : "↗"}</span>
    </a>
  );
  if (!hideOnceJoined) return card;
  return (
    <div>
      {card}
      <button
        type="button"
        onClick={() => {
          joined();
          setHidden(true);
        }}
        className="mt-1.5 text-xs text-stone-400 hover:text-navy hover:underline"
      >
        Already joined? Hide this
      </button>
    </div>
  );
}

// The guidelines page's buttons (Kai, 4 Nov 2026): tick "I agree" first,
// then "Join the group" opens the group and counts as joined, so the
// top-bar "Join WhatsApp" goes away.
export function WhatsAppAgree({ url }: { url: string }) {
  const [agreed, setAgreed] = useState(false);
  const [done, setDone] = useState(false);
  const mark = () =>
    createClient()
      .rpc("mark_whatsapp_joined")
      .then(() => {});
  const look =
    "flex w-full items-center justify-center gap-2.5 rounded-2xl px-4 py-3.5 font-semibold shadow-sm";
  return (
    <div className="mt-6">
      <label className="mb-3 flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 text-sm text-stone-700 shadow-sm ring-1 ring-black/5">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#25D366]"
        />
        <span>
          I&apos;ve read the community guidelines and agree to follow them.
        </span>
      </label>
      {agreed ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            mark();
            setDone(true);
          }}
          className={`${look} bg-[#25D366] text-navy hover:brightness-95`}
        >
          <WhatsAppIcon className="h-6 w-6 shrink-0" />
          Join the group
          <span aria-hidden>↗</span>
        </a>
      ) : (
        <button
          type="button"
          disabled
          className={`${look} cursor-not-allowed bg-stone-200 text-stone-400 shadow-none`}
        >
          <WhatsAppIcon className="h-6 w-6 shrink-0" />
          Join the group
        </button>
      )}
      {done ? (
        <p className="mt-2 text-center text-sm text-stone-500">
          Welcome! See you in the chat.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => {
            mark();
            setDone(true);
          }}
          className="mx-auto mt-2 block text-xs text-stone-400 hover:text-navy hover:underline"
        >
          Already in the group? Hide the button
        </button>
      )}
    </div>
  );
}

// Organiser view: QR to show newcomers, plus changing the link.
export function WhatsAppShare({ initial }: { initial: string | null }) {
  const [url, setUrl] = useState(initial);
  const [editing, setEditing] = useState(!initial);
  const [draft, setDraft] = useState(initial ?? "");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      {url && !editing && (
        <>
          <p className="text-sm text-stone-600">
            Show this to newcomers so they can join the WhatsApp community.
          </p>
          <ShareLink
            url={url}
            title="We The Free WhatsApp"
            text="Join the We The Free WhatsApp community:"
            qrLabel="WhatsApp community QR code"
          />
          <button
            onClick={() => setEditing(true)}
            className="w-full rounded-xl px-4 py-2 text-sm font-medium text-stone-600 hover:bg-black/5"
          >
            Change link
          </button>
        </>
      )}
      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await setTeamWhatsapp(draft);
              if (r.error) setError(r.error);
              else {
                setError("");
                setUrl(r.url ?? null);
                setEditing(!r.url);
              }
            });
          }}
          className="space-y-2"
        >
          <label htmlFor="wa" className="text-sm font-medium">
            WhatsApp invite link
          </label>
          <input
            id="wa"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://chat.whatsapp.com/…"
            className={inputClass}
          />
          <p className="text-xs text-stone-500">
            In WhatsApp: open the community → Invite via link → Copy. If you
            ever tap “Reset link” there, paste the new one here.
          </p>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save link"}
            </button>
            {url && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-xl px-4 py-2.5 text-stone-600 hover:bg-black/5"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
