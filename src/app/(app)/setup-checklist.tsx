"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/sheet";

export type SetupStatus = {
  whatsapp: boolean;
  events: boolean;
  actions: boolean;
  core_team: boolean;
  dismissed: boolean;
};

function Row({
  done,
  title,
  text,
  children,
}: {
  done: boolean;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-cyan text-navy" : "ring-2 ring-stone-300"}`}
      >
        {done ? "✓" : ""}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`font-medium ${done ? "text-stone-400 line-through" : "text-navy"}`}
        >
          {title}
        </p>
        {!done && <p className="text-sm text-stone-600">{text}</p>}
        {!done && children && <div className="mt-1.5">{children}</div>}
      </div>
    </li>
  );
}

// "Get <community> ready": a short list for a new community. Each item ticks
// itself off; the card goes away once they're all done (or it's hidden).
export function SetupChecklist({
  teamId,
  community,
  status,
  preview = false,
  autoOpen = false,
}: {
  teamId: string;
  community: string;
  status: SetupStatus;
  preview?: boolean; // the tour: nothing is saved
  autoOpen?: boolean; // straight after the tour
}) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(autoOpen);
  const [wa, setWa] = useState("");
  const [waOpen, setWaOpen] = useState(false);
  const [waDone, setWaDone] = useState(status.whatsapp);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const items = [
    { key: "whatsapp", done: waDone },
    { key: "events", done: status.events },
    { key: "actions", done: status.actions },
    { key: "core_team", done: status.core_team },
  ];
  const doneCount = items.filter((i) => i.done).length;
  if (hidden || doneCount === items.length) return null;

  const link =
    "text-sm font-semibold text-pink-ink hover:underline whitespace-nowrap";

  const name = preview ? "your community" : community;
  const close = () => {
    setOpen(false);
    if (autoOpen) router.replace("/");
  };
  return (
    <>
      <button
        type="button"
        data-tour="setup-checklist"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-pink/15 px-3 py-1.5 text-sm font-semibold text-pink-ink ring-1 ring-pink/40 hover:bg-pink/25"
      >
        Get {name} ready
        <span className="font-normal">
          {doneCount} of {items.length}
        </span>
      </button>
      {open && (
        <Sheet title={`Get ${name} ready`} onClose={close}>
          <p className="text-sm text-stone-600">
            A few things to set up so the Hub can do the work for you.{" "}
            {doneCount} of {items.length} done.
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-pink transition-all"
              style={{ width: `${(doneCount / items.length) * 100}%` }}
            />
          </div>
          <ul className="mt-4 space-y-4">
            <Row
              done={waDone}
              title="Add your community chat"
              text="Paste the invite link to your WhatsApp community or group, so the Hub can open it for you and share it with volunteers."
            >
              {waOpen ? (
                <form
                  className="flex flex-wrap gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setError("");
                    const url = wa.trim();
                    if (
                      !/^https?:\/\/(chat\.whatsapp\.com|(www\.)?whatsapp\.com|wa\.me)\//i.test(
                        url,
                      )
                    )
                      return setError(
                        "That doesn't look like a WhatsApp invite link (it starts with https://chat.whatsapp.com/).",
                      );
                    if (preview) return setWaDone(true);
                    start(async () => {
                      const { data } = await createClient().rpc(
                        "set_team_whatsapp",
                        { p_url: url, p_team_id: teamId },
                      );
                      if (data === "invalid")
                        return setError(
                          "That doesn't look like a WhatsApp invite link (it starts with https://chat.whatsapp.com/).",
                        );
                      if (data !== "ok")
                        return setError("Couldn't save that. Try again?");
                      setWaDone(true);
                      router.refresh();
                    });
                  }}
                >
                  <input
                    autoFocus
                    value={wa}
                    onChange={(e) => setWa(e.target.value)}
                    placeholder="https://chat.whatsapp.com/…"
                    className="min-w-0 flex-1 rounded-lg bg-white px-2.5 py-1.5 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Save
                  </button>
                  {error && (
                    <p className="w-full text-sm text-red-700">{error}</p>
                  )}
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setWaOpen(true)}
                  className={link}
                >
                  Add link
                </button>
              )}
            </Row>
            <Row
              done={status.events}
              title="Get your events in"
              text="Events listed on your activism.wtf page come in by themselves every hour. You can also add one here."
            >
              <Link href="/events/new" className={link}>
                Add event
              </Link>
            </Row>
            <Row
              done={status.actions}
              title="Pick your actions"
              text="Choose which regular actions the Hub reminds you about, based on how much time you have."
            >
              <Link href="/tasks" className={link}>
                Choose actions
              </Link>
            </Row>
            <Row
              done={status.core_team}
              title="Add your Core Team"
              text="Give a few regulars a Core Team role so they can check people in and share the load."
            >
              <Link href="/roles" className={link}>
                Go to Roles
              </Link>
            </Row>
          </ul>
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setHidden(true);
                close();
                if (preview) return;
                void createClient().rpc("dismiss_team_setup", {
                  p_team_id: teamId,
                });
              }}
              className="text-xs text-stone-400 hover:text-stone-700 hover:underline"
            >
              Don&apos;t show this again
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white"
            >
              Later
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
