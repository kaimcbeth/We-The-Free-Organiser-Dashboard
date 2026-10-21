"use client";

import Link from "next/link";
import { useState } from "react";
import type { ConnectContext, ConnectIdea } from "@/lib/connect";

// Inside a "Organisers checked in with" task: who to message, what to ask
// about, and a suggested opener to copy.
export function ConnectIdeas({ ctx }: { ctx: ConnectContext }) {
  const [message, setMessage] = useState(ctx.message);
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-3 rounded-xl bg-stone-50 p-3 ring-1 ring-black/5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Organisers
        </p>
        {ctx.organisers.length === 0 ? (
          <p className="mt-0.5 text-sm text-stone-500">
            No organisers with an account yet.
          </p>
        ) : (
          <ul className="mt-1 flex flex-wrap gap-2">
            {ctx.organisers.map((o) => (
              <li
                key={o.name}
                className="flex items-center gap-1.5 rounded-lg bg-white py-1 pl-2.5 pr-1 text-sm ring-1 ring-black/5"
              >
                <span className="font-medium">{o.name}</span>
                {o.whatsapp && (
                  <a
                    href={`${o.whatsapp}?text=${encodeURIComponent(message)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-[#25D366] px-2 py-0.5 text-xs font-semibold text-navy"
                  >
                    WhatsApp ↗
                  </a>
                )}
                {o.email && (
                  <a
                    href={`mailto:${o.email}?body=${encodeURIComponent(message)}`}
                    className="rounded-md px-2 py-0.5 text-xs font-semibold text-pink-ink hover:bg-stone-100"
                  >
                    Email
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {ctx.quiet && (
        <p className="rounded-lg bg-yellow/30 px-2.5 py-1.5 text-sm text-navy">
          Nothing in the last month and nothing coming up. Worth seeing how
          they&apos;re going.
        </p>
      )}
      <Ideas title="Recent events" ideas={ctx.recent} />
      <Ideas title="Coming up" ideas={ctx.upcoming} />

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Suggested message
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(message);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              /* clipboard blocked: the text can still be selected */
            }
          }}
          className={`mt-1 rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ${
            copied
              ? "bg-cyan text-navy ring-cyan"
              : "bg-white text-navy ring-stone-300 hover:bg-stone-100"
          }`}
        >
          {copied ? "Copied" : "Copy message"}
        </button>
      </div>
    </div>
  );
}

function Ideas({ title, ideas }: { title: string; ideas: ConnectIdea[] }) {
  if (ideas.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {title}
      </p>
      <ul className="mt-1 space-y-1">
        {ideas.map((i) => (
          <li key={i.eventId} className="text-sm">
            <Link
              href={`/events/${i.eventId}`}
              className="text-navy hover:underline"
            >
              {i.label}
            </Link>
            {i.note && (
              <span
                className={`ml-1.5 inline-block whitespace-nowrap rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                  i.note === "Outreach"
                    ? "bg-pink/20 text-pink-ink"
                    : "bg-yellow/40 text-navy"
                }`}
              >
                {i.note}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
