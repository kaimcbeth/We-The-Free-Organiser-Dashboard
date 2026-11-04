"use client";

import { useState } from "react";
import { WhatsAppAgree, WhatsAppIcon } from "@/components/whatsapp";

// Join the WhatsApp community (Kai, 4 Nov 2026): opened from "Join WhatsApp"
// in the members' top bar. A basic code of conduct for the chats (from the
// WTF Code of Conduct v1.0, sections 3 and 5), then "I agree, join the group".
const RULES: { title: string; text: string }[] = [
  {
    title: "Be kind and respectful",
    text: "No bullying, harassment, threats or discrimination, towards anyone in the group or outside it.",
  },
  {
    title: "Use the right chat",
    text: "Post in the chat that fits, so nobody gets flooded.",
  },
  {
    title: "Keep people's details private",
    text: "Don't share anyone's phone number, photos of them or screenshots of the chat without their OK.",
  },
  {
    title: "Only share what's true",
    text: "Check news, studies and footage before you pass them on.",
  },
  {
    title: "Focus on what unites us",
    text: "Steer clear of divisive topics outside animal rights, like vaccines or family planning. They pull people apart and push some out.",
  },
  {
    title: "No unwanted advances",
    text: "No unwanted or sexual comments or messages, in the group or in private messages to members.",
  },
  {
    title: "Warn before graphic footage",
    text: "Add a content warning before posting anything graphic, and never share it where under 15s could see it.",
  },
  {
    title: "No selling or spam",
    text: "Ask an organiser before promoting a business, fundraiser or another group.",
  },
];

// The smaller chats inside the community (examples; Kai can rename).
const CHATS: { icon: string; name: string; text: string; tint: string }[] = [
  {
    icon: "📣",
    name: "Announcements",
    text: "The big stuff, for everyone",
    tint: "bg-yellow/90",
  },
  {
    icon: "📅",
    name: "Events",
    text: "What's on and who's coming",
    tint: "bg-cyan/90",
  },
  {
    icon: "📸",
    name: "Photos",
    text: "Snaps from our events",
    tint: "bg-pink/90",
  },
  {
    icon: "🥗",
    name: "Food",
    text: "Recipes, finds and potlucks",
    tint: "bg-[#25D366]/90",
  },
  {
    icon: "💬",
    name: "Hangout",
    text: "Chat about anything",
    tint: "bg-white/90",
  },
];

function Steps({ step }: { step: 1 | 2 }) {
  return (
    <div className="mt-4 flex items-center gap-2 text-xs font-semibold">
      {(["Welcome", "Guidelines"] as const).map((label, i) => {
        const on = step === i + 1;
        return (
          <span key={label} className="flex items-center gap-2">
            {i > 0 && <span className="h-px w-6 bg-stone-300" />}
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${
                on ? "bg-navy text-white" : "bg-stone-200 text-stone-500"
              }`}
            >
              <span>{i + 1}</span>
              {label}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function WhatsAppGuidelines({
  community,
  url,
  preview = false,
}: {
  community: string;
  url: string | null;
  preview?: boolean;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const go = (s: 1 | 2) => {
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-navy">
        Join our WhatsApp community
      </h1>
      <Steps step={step} />

      {step === 1 ? (
        <>
          <section className="relative mt-5 overflow-hidden rounded-3xl bg-navy p-6 text-white shadow-lg">
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#25D366]/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-pink/30 blur-3xl" />
            <div className="relative">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25D366] text-navy shadow-md shadow-[#25D366]/40">
                <WhatsAppIcon className="h-8 w-8" />
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight">
                Welcome to the chat
              </h2>
              <p className="mt-2 text-sm text-white/80">
                Most of the chat for We The Free
                {community ? ` ${community}` : ""} happens on WhatsApp.
                It&apos;s one community with a few smaller chats inside, each
                for something different.
              </p>

              <ul className="mt-5 space-y-2">
                {CHATS.map((c, i) => (
                  <li
                    key={c.name}
                    className={`flex items-center gap-3 rounded-2xl bg-white/10 p-2.5 pr-4 ring-1 ring-white/10 backdrop-blur ${
                      i % 2 ? "ml-6" : "mr-6"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${c.tint}`}
                      aria-hidden
                    >
                      {c.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {c.name}
                      </span>
                      <span className="block truncate text-xs text-white/70">
                        {c.text}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              [
                "Pick and choose",
                "Join whichever chats you like. You don't need to be in all of them.",
              ],
              [
                "Mute or leave",
                "Too busy? Mute or leave any chat whenever you want.",
              ],
              [
                "Never miss the big stuff",
                "Important updates go to everyone in the community.",
              ],
            ].map(([t, d]) => (
              <div
                key={t}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
              >
                <p className="text-sm font-semibold text-navy">{t}</p>
                <p className="mt-1 text-sm text-stone-600">{d}</p>
              </div>
            ))}
          </section>

          <button
            type="button"
            onClick={() => go(2)}
            className="mt-6 w-full rounded-2xl bg-navy px-4 py-3.5 font-semibold text-white shadow-sm hover:bg-navy/90"
          >
            Next: community guidelines
          </button>
        </>
      ) : (
        <>
          <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h2 className="font-semibold text-navy">Community guidelines</h2>
            <p className="mt-1 text-sm text-stone-500">
              How we look after each other in the chats.
            </p>
            <ol className="mt-4 space-y-3">
              {RULES.map((r, i) => (
                <li key={r.title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan text-xs font-bold text-navy">
                    {i + 1}
                  </span>
                  <span className="text-sm text-stone-700">
                    <span className="font-semibold text-navy">{r.title}.</span>{" "}
                    {r.text}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 border-t border-stone-100 pt-3 text-sm text-stone-500">
              Something not right? Message an organiser privately. Organisers
              may remove anyone who doesn&apos;t follow these guidelines.
            </p>
          </section>
          {url ? (
            <WhatsAppAgree url={url} preview={preview} />
          ) : (
            <p className="mt-6 rounded-2xl border border-dashed border-stone-300 px-4 py-5 text-center text-sm text-stone-500">
              Your community hasn&apos;t added its WhatsApp link yet. Ask an
              organiser.
            </p>
          )}
          <button
            type="button"
            onClick={() => go(1)}
            className="mt-4 block w-full text-center text-sm text-stone-500 hover:text-navy"
          >
            Back to the welcome
          </button>
        </>
      )}
    </>
  );
}
