"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MENTAL_HEALTH_URL,
  THEORY_OF_CHANGE_URL,
  WELCOME_CARDS,
} from "@/lib/welcome";

// "Welcome to We The Free": a few cards on mission and values for new members.
// With `track`, reaching the last card marks it done for this member.
export function WelcomeFlow({
  doneHref = "/me",
  track = false,
}: {
  doneHref?: string;
  track?: boolean;
}) {
  const [i, setI] = useState(0);
  const card = WELCOME_CARDS[i];
  const last = i === WELCOME_CARDS.length - 1;

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
      {/* eslint-disable-next-line @next/next/no-img-element -- remote photo */}
      <img
        key={card.image + i}
        src={card.image}
        alt={card.imageAlt}
        className="aspect-[16/9] w-full bg-navy/10 object-cover"
      />
      <div className="p-5">
        <div
          className="flex gap-1.5"
          aria-label={`Card ${i + 1} of ${WELCOME_CARDS.length}`}
        >
          {WELCOME_CARDS.map((c, n) => (
            <button
              key={c.title}
              type="button"
              onClick={() => setI(n)}
              aria-label={c.title}
              className={`h-1.5 flex-1 rounded-full ${n <= i ? "bg-pink" : "bg-stone-200"}`}
            />
          ))}
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-navy">
          {card.title}
        </h2>
        {card.body.map((p) => (
          <p key={p} className="mt-2 text-stone-700">
            {p}
          </p>
        ))}
        {card.list && (
          <ul className="mt-3 space-y-2.5">
            {card.list.map((l) => (
              <li key={l.title}>
                <p className="font-semibold text-navy">{l.title}</p>
                <p className="text-sm text-stone-600">{l.text}</p>
              </li>
            ))}
          </ul>
        )}
        {card.title === "How we show up" && (
          <a
            href={MENTAL_HEALTH_URL}
            target="_blank"
            rel="noopener"
            className="mt-3 inline-block text-sm font-medium text-pink-ink hover:underline"
          >
            Mental health resources ↗
          </a>
        )}
        {card.title === "Why we do what we do" && (
          <a
            href={THEORY_OF_CHANGE_URL}
            target="_blank"
            rel="noopener"
            className="mt-3 inline-block text-sm font-medium text-pink-ink hover:underline"
          >
            Read our theory of change ↗
          </a>
        )}
        <div className="mt-6 flex gap-2">
          {i > 0 && (
            <button
              type="button"
              onClick={() => setI(i - 1)}
              className="rounded-2xl px-4 py-3 font-semibold text-stone-600 ring-1 ring-black/10 hover:bg-stone-50"
            >
              Back
            </button>
          )}
          {last ? (
            <Link
              href={doneHref}
              className="flex-1 rounded-2xl bg-pink px-4 py-3 text-center font-semibold text-navy hover:bg-pink-strong"
            >
              See what&apos;s coming up
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (track && i + 1 === WELCOME_CARDS.length - 1)
                  createClient()
                    .rpc("mark_welcome_done")
                    .then(() => {});
                setI(i + 1);
              }}
              className="flex-1 rounded-2xl bg-pink px-4 py-3 font-semibold text-navy hover:bg-pink-strong"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
