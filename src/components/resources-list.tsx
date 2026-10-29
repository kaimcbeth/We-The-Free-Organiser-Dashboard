"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { RESOURCE_SECTIONS, RESOURCES_COMING_SOON } from "@/lib/resources";
import { CommunityPhotos } from "@/components/community-photos";
import { GuideShare } from "@/components/guide-share";

const has = (q: string, ...text: (string | undefined)[]) =>
  !q || text.some((t) => t?.toLowerCase().includes(q));

// The Resources & Training page (organisers and the Core Team).
export function ResourcesList({
  teamId,
  teamSlug,
}: {
  teamId: string | null;
  teamSlug: string | null;
}) {
  const path = usePathname();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const sections = RESOURCE_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((r) =>
      has(q, r.title, r.about, r.area, r.tip, s.title),
    ),
  })).filter((s) => s.items.length);
  const soon = RESOURCES_COMING_SOON.filter((r) => has(q, r.title, r.about));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Resources &amp; Training
      </h1>
      <p className="mt-1 text-sm text-stone-600">
        Guides and documents for running events, and your gear. More coming
        soon.
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search resources"
        aria-label="Search resources"
        className="mt-4 w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
      />
      {has(q, "outreach guide conversation questions objections ibc") && (
        <a
          href="/guide"
          className="mt-6 flex items-center justify-between rounded-2xl bg-pink px-4 py-3 text-navy"
        >
          <span>
            <span className="block font-semibold">
              <span aria-hidden className="mr-1.5">
                💬
              </span>
              Outreach guide
            </span>
            <span className="block text-sm">
              The conversation questions, for a quick look between
              conversations. Volunteers have it on their page too.
            </span>
          </span>
          <span aria-hidden className="text-xl">
            →
          </span>
        </a>
      )}
      {teamSlug &&
        has(q, "outreach guide conversation questions qr newcomer") && (
          <div className="mt-2 text-right">
            <GuideShare
              slug={teamSlug}
              label="Show QR code for newcomers"
              className="text-sm font-medium text-pink-ink hover:underline"
            />
          </div>
        )}
      {has(q, "welcome mission values onboarding new members first event") && (
        <a
          href="/me/welcome"
          className="mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink"
        >
          <span>
            <span className="block font-semibold">
              <span aria-hidden className="mr-1.5">
                👋
              </span>
              Welcome to We The Free
            </span>
            <span className="block text-sm text-stone-600">
              Mission, values and what to expect at a first event, in five short
              cards. New members see it when they connect.
            </span>
          </span>
          <span aria-hidden className="text-xl">
            →
          </span>
        </a>
      )}
      {sections.map((s) => (
        <section key={s.title} className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
            {s.title}
          </h2>
          <ul className="space-y-3">
            {s.items.map((r) => (
              <li key={r.file}>
                <a
                  href={r.file}
                  target="_blank"
                  rel="noopener"
                  className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 hover:ring-pink"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">
                      {r.emoji && (
                        <span aria-hidden className="mr-1.5">
                          {r.emoji}
                        </span>
                      )}
                      {r.title}
                    </h3>
                    {r.area && (
                      <span className="rounded-full bg-cyan/25 px-2 py-0.5 text-xs font-semibold text-navy">
                        {r.area}
                      </span>
                    )}
                    <span aria-hidden className="ml-auto text-stone-400">
                      ↗
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-stone-600">{r.about}</p>
                  {r.tip && (
                    <p className="mt-1 text-xs text-stone-500">{r.tip}</p>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {has(
        q,
        "equipment guide inventory gear buy table signs headphones splitters a-frame kit australia",
      ) && (
        <a
          href={`${path.replace(/\/$/, "")}/equipment`}
          className="mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink"
        >
          <span>
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">
                <span aria-hidden className="mr-1.5">
                  🧰
                </span>
                Equipment guide and inventory
              </span>
              <span className="rounded-full bg-cyan/25 px-2 py-0.5 text-xs font-semibold text-navy">
                Australia
              </span>
            </span>
            <span className="block text-sm text-stone-600">
              The base kit, upgrades and where to buy them. Mark what your
              community has, and keep track of who has each thing.
            </span>
          </span>
          <span aria-hidden className="text-xl">
            →
          </span>
        </a>
      )}
      {teamId && !q && <CommunityPhotos teamId={teamId} />}
      {soon.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Coming soon
          </h2>
          <ul className="space-y-2">
            {soon.map((r) => (
              <li
                key={r.title}
                className="rounded-2xl border border-dashed border-stone-300 px-4 py-3"
              >
                <p className="font-medium text-stone-700">{r.title}</p>
                <p className="text-sm text-stone-500">{r.about}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-10 text-xs text-stone-400">
        The Movement Hub is open source.{" "}
        <a
          href="https://github.com/kaimcbeth/We-The-Free-Organiser-Dashboard"
          target="_blank"
          rel="noopener"
          className="underline hover:text-stone-700"
        >
          Source code
        </a>
      </p>
      {q && !sections.length && !soon.length && (
        <p className="mt-6 text-sm text-stone-500">
          Nothing matches &ldquo;{query}&rdquo;.
        </p>
      )}
    </div>
  );
}
