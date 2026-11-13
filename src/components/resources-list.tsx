"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { RESOURCE_SECTIONS, RESOURCES_COMING_SOON } from "@/lib/resources";
import { CommunityPhotos } from "@/components/community-photos";
import { GuideShare } from "@/components/guide-share";
import { FeedbackCards } from "@/components/feedback-cards";
import { PodShareButton } from "@/components/engagement-pod";
import { SOCIAL_POSTS, slideUrl } from "@/lib/social-posts";
import { DISCUSSION_PROMPTS } from "@/lib/discussion-prompts";
import { NewTag, SeenProvider } from "@/components/new-tag";

const has = (q: string, ...text: (string | undefined)[]) =>
  !q || text.some((t) => t?.toLowerCase().includes(q));

// The Resources & Training page (organisers and the Core Team).
export function ResourcesList({
  teamId,
  teamSlug,
  rsl = false,
}: {
  teamId: string | null;
  teamSlug: string | null;
  isGod?: boolean; // (unused now: Facebook groups is for all organisers)
  rsl?: boolean; // Regional Support Lead or God: the hangout builder
}) {
  const path = usePathname();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const core = path.startsWith("/attendance");
  const sections = RESOURCE_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter(
      (r) =>
        !(core && r.organisersOnly) &&
        has(q, r.title, r.about, r.area, r.tip, s.title),
    ),
  })).filter((s) => s.items.length);
  const soon = RESOURCES_COMING_SOON.filter(
    (r) => !(core && r.organisersOnly) && has(q, r.title, r.about),
  );

  return (
    <SeenProvider>
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
        {has(
          q,
          "social media hub instagram posts carousel caption repost share main page",
          ...SOCIAL_POSTS.map((p) => p.title),
        ) && (
          <a
            href={`${path.replace(/\/$/, "")}/social`}
            data-resource="social"
            className="mt-6 flex items-center gap-4 rounded-2xl bg-navy p-4 text-white shadow-sm hover:ring-2 hover:ring-pink"
          >
            {SOCIAL_POSTS[0] && (
              // eslint-disable-next-line @next/next/no-img-element -- small static preview
              <img
                src={slideUrl(SOCIAL_POSTS[0], 1)}
                alt=""
                className="h-20 w-16 shrink-0 rounded-lg object-cover"
              />
            )}
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">
                <span aria-hidden className="mr-1.5">
                  📲
                </span>
                Social Media Hub
                <NewTag k="social" />
              </span>
              <span className="block text-sm text-white/75">
                Posts from the We The Free main page with captions, ready to
                post on your Instagram with your username on them.
                {SOCIAL_POSTS[0] && (
                  <>
                    {" "}
                    Newest:{" "}
                    <b className="text-white">{SOCIAL_POSTS[0].title}</b>
                  </>
                )}
              </span>
            </span>
            <span aria-hidden className="text-xl">
              →
            </span>
          </a>
        )}
        {rsl &&
          !core &&
          has(
            q,
            "organiser hangout monthly call slides deck powerpoint icebreaker exercise announcements speaker notes present",
          ) && (
            <a
              href="/resources/hangouts"
              data-resource="hangouts"
              className="mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink"
            >
              <span>
                <span className="block font-semibold">
                  <span aria-hidden className="mr-1.5">
                    🗓️
                  </span>
                  Organiser hangouts
                  <NewTag k="hangouts" />
                </span>
                <span className="block text-sm text-stone-600">
                  Put together this month&apos;s one-hour organiser hangout from
                  icebreakers, exercises and announcements, then present it or
                  download the slides with speaker notes.
                </span>
              </span>
              <span aria-hidden className="text-xl">
                →
              </span>
            </a>
          )}
        {has(
          q,
          "outreach guide conversation questions objections ibc qr newcomer",
        ) && (
          <div className="relative mt-3 rounded-2xl bg-white text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink">
            <a
              href="/guide"
              className="flex items-center justify-between px-4 pb-8 pt-3"
            >
              <span>
                <span className="block font-semibold">
                  <span aria-hidden className="mr-1.5">
                    💬
                  </span>
                  Outreach guide
                </span>
                <span className="block text-sm text-stone-600">
                  The conversation questions, for a quick look between
                  conversations. Members have it on their page too.
                </span>
              </span>
              <span aria-hidden className="text-xl">
                →
              </span>
            </a>
            {teamSlug && (
              <span className="absolute bottom-2.5 left-4">
                <GuideShare
                  slug={teamSlug}
                  label="Show QR code for newcomers"
                  className="text-xs text-stone-400 hover:text-navy hover:underline"
                />
              </span>
            )}
          </div>
        )}
        {has(
          q,
          "ibc masterclass inspiring behaviour change training coaching outreach objections role play practice",
        ) && (
          <a
            href="https://activism.wtf/ibc/masterclass"
            data-resource="ibc"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink"
          >
            <span>
              <span className="block font-semibold">
                <span aria-hidden className="mr-1.5">
                  🎓
                </span>
                IBC Masterclass
                <NewTag k="ibc" />
              </span>
              <span className="block text-sm text-stone-600">
                The full Inspiring Behaviour Change handout: how to stop
                debating and start coaching, the 15 questions, handling
                objections, role plays and an AI practice tool.
              </span>
            </span>
            <span aria-hidden className="text-xl">
              ↗
            </span>
          </a>
        )}
        {has(
          q,
          "welcome mission values onboarding new members first event",
        ) && (
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
                Mission, values and what to expect at a first event, in five
                short cards. New members see it when they connect.
              </span>
            </span>
            <span aria-hidden className="text-xl">
              →
            </span>
          </a>
        )}
        {!core &&
          has(
            q,
            "feedback form members organisers global support regional support lead anonymous link share",
          ) && <FeedbackCards teamId={teamId} />}
        {teamId &&
          has(
            q,
            "engagement pod facebook post like comment newcomer share boost",
          ) && (
            <div data-resource="engagement-pod">
              <PodShareButton
                teamId={teamId}
                canEditChat={!core}
                className="mt-3 flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink"
              >
                <span>
                  <span className="block font-semibold">
                    <span aria-hidden className="mr-1.5">
                      🙌
                    </span>
                    Engagement pod
                    <NewTag k="engagement-pod" />
                  </span>
                  <span className="block text-sm text-stone-600">
                    Share a community member&apos;s Facebook post so the pod
                    likes and comments on it. See who&apos;s in the pod.
                  </span>
                </span>
                <span aria-hidden className="text-xl">
                  →
                </span>
              </PodShareButton>
            </div>
          )}
        {sections.map((s) => (
          <section key={s.title} className="mt-3">
            <ul className="space-y-3">
              {s.items.map((r) => (
                <li key={r.file}>
                  <a
                    href={r.file}
                    data-resource={r.file}
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
                        <NewTag k={r.file} />
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
            data-resource="equipment"
            className="mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink"
          >
            <span>
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  <span aria-hidden className="mr-1.5">
                    🧰
                  </span>
                  Equipment guide and inventory
                  <NewTag k="equipment" />
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
        {has(
          q,
          "recommended prizes treats movie challenge biscuits cookies oreo biscoff lollies chips vegan reimbursement",
        ) && (
          <a
            href={`${path.replace(/\/$/, "")}/prizes`}
            data-resource="prizes"
            className="mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink"
          >
            <span>
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  <span aria-hidden className="mr-1.5">
                    🍪
                  </span>
                  Recommended prizes
                  <NewTag k="prizes" />
                </span>
                <span className="rounded-full bg-cyan/25 px-2 py-0.5 text-xs font-semibold text-navy">
                  Australia
                </span>
              </span>
              <span className="block text-sm text-stone-600">
                Vegan treats for the Movie Challenge: cost per prize against the
                reimbursement, where to buy, and how many packs to get.
              </span>
            </span>
            <span aria-hidden className="text-xl">
              →
            </span>
          </a>
        )}
        {!core &&
          has(
            q,
            "movie player challenge video film laptop offline survey impact a/b test live count",
          ) && (
            <a
              href="/resources/movie-player"
              data-resource="movie-player"
              className="mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink"
            >
              <span>
                <span className="block font-semibold">
                  <span aria-hidden className="mr-1.5">
                    🎬
                  </span>
                  Movie player
                  <NewTag k="movie-player" />
                </span>
                <span className="block text-sm text-stone-600">
                  Play the Movie Challenge films on laptops with no internet,
                  with a quick impact question after each. See the live count
                  and which film has the most impact.
                </span>
              </span>
              <span aria-hidden className="text-xl">
                →
              </span>
            </a>
          )}
        {!path.startsWith("/attendance") &&
          has(
            q,
            "group chat discussion prompts questions whatsapp community",
          ) && (
            <a
              href="/resources/prompts"
              className="mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink"
            >
              <span>
                <span className="block font-semibold">
                  <span aria-hidden className="mr-1.5">
                    💬
                  </span>
                  Group chat discussion prompts
                </span>
                <span className="block text-sm text-stone-600">
                  {DISCUSSION_PROMPTS.length} questions to post in your
                  community chat between events. Pick one, copy it, mark it
                  posted.
                </span>
              </span>
              <span aria-hidden className="text-xl">
                →
              </span>
            </a>
          )}
        {!core &&
          has(q, "facebook fb groups promote local vegan community") && (
            <a
              href="/facebook-groups"
              className="mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink"
            >
              <span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">
                    <span aria-hidden className="mr-1.5">
                      👥
                    </span>
                    Facebook groups
                  </span>
                </span>
                <span className="block text-sm text-stone-600">
                  Local vegan Facebook groups to share your events in, with Open
                  all to post in every group near you.
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
    </SeenProvider>
  );
}
