"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { RESOURCE_SECTIONS, RESOURCES_COMING_SOON } from "@/lib/resources";
import { CommunityPhotos } from "@/components/community-photos";
import { Pinnable } from "@/components/nav-pins-context";
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
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {has(
            q,
            "social media hub instagram posts carousel caption repost share main page",
            ...SOCIAL_POSTS.map((p) => p.title),
          ) && (
            <Pinnable k="social" dark className="sm:col-span-2">
              <a
                href={`${path.replace(/\/$/, "")}/social`}
                data-resource="social"
                className="flex h-full items-center gap-4 rounded-2xl bg-navy p-4 text-white shadow-sm hover:ring-2 hover:ring-pink"
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
                    Ready-made posts with your @handle on them.
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
            </Pinnable>
          )}
          {rsl &&
            !core &&
            has(
              q,
              "organiser hangout monthly call slides deck powerpoint icebreaker exercise activity activities announcements speaker notes present",
            ) && (
              <Pinnable k="hangouts">
                <a
                  href="/resources/hangouts"
                  data-resource="hangouts"
                  className="flex h-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink"
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
                      Build this month&apos;s hangout and present it.
                    </span>
                  </span>
                  <span aria-hidden className="text-xl">
                    →
                  </span>
                </a>
              </Pinnable>
            )}
          {has(
            q,
            "outreach guide conversation questions objections ibc qr newcomer",
          ) && (
            <div className="relative h-full rounded-2xl bg-white text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink">
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
                    The conversation questions, for between chats.
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
              className="flex h-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink"
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
                  The full Inspiring Behaviour Change handout.
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
              className="flex h-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink"
            >
              <span>
                <span className="block font-semibold">
                  <span aria-hidden className="mr-1.5">
                    👋
                  </span>
                  Welcome to We The Free
                </span>
                <span className="block text-sm text-stone-600">
                  What new members see when they join.
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
              <div data-resource="engagement-pod" className="h-full">
                <PodShareButton
                  teamId={teamId}
                  canEditChat={!core}
                  className="flex h-full w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink"
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
                      Get the pod to like and comment on a post.
                    </span>
                  </span>
                  <span aria-hidden className="text-xl">
                    →
                  </span>
                </PodShareButton>
              </div>
            )}
          {sections.flatMap((s) =>
            s.items.map((r) => (
              <a
                key={r.file}
                href={r.file}
                data-resource={r.file}
                target="_blank"
                rel="noopener"
                className="block h-full rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5 hover:ring-pink"
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
                <p className="text-sm text-stone-600">{r.about}</p>
                {r.tip && (
                  <p className="mt-1 text-xs text-stone-500">{r.tip}</p>
                )}
              </a>
            )),
          )}
          {has(
            q,
            "equipment guide inventory gear buy table signs headphones splitters a-frame kit australia",
          ) && (
            <Pinnable k="equipment">
              <a
                href={`${path.replace(/\/$/, "")}/equipment`}
                data-resource="equipment"
                className="flex h-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink"
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
                    Your kit, upgrades and where to buy them.
                  </span>
                </span>
                <span aria-hidden className="text-xl">
                  →
                </span>
              </a>
            </Pinnable>
          )}
          {has(
            q,
            "recommended prizes treats movie challenge biscuits cookies oreo biscoff lollies chips vegan reimbursement",
          ) && (
            <Pinnable k="prizes">
              <a
                href={`${path.replace(/\/$/, "")}/prizes`}
                data-resource="prizes"
                className="flex h-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink"
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
                    Vegan treats for the Movie Challenge.
                  </span>
                </span>
                <span aria-hidden className="text-xl">
                  →
                </span>
              </a>
            </Pinnable>
          )}
          {!core &&
            has(
              q,
              "movie player challenge video film laptop offline survey impact a/b test live count",
            ) && (
              <Pinnable k="movie-player">
                <a
                  href="/resources/movie-player"
                  data-resource="movie-player"
                  className="flex h-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink"
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
                      Play the films offline and see their impact.
                    </span>
                  </span>
                  <span aria-hidden className="text-xl">
                    →
                  </span>
                </a>
              </Pinnable>
            )}
          {!path.startsWith("/attendance") &&
            has(
              q,
              "group chat discussion prompts questions whatsapp community",
            ) && (
              <Pinnable k="prompts">
                <a
                  href="/resources/prompts"
                  className="flex h-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink"
                >
                  <span>
                    <span className="block font-semibold">
                      <span aria-hidden className="mr-1.5">
                        💬
                      </span>
                      Group chat discussion prompts
                    </span>
                    <span className="block text-sm text-stone-600">
                      {DISCUSSION_PROMPTS.length} questions for your community
                      chat.
                    </span>
                  </span>
                  <span aria-hidden className="text-xl">
                    →
                  </span>
                </a>
              </Pinnable>
            )}
          {!core &&
            has(q, "facebook fb groups promote local vegan community") && (
              <Pinnable k="fb-groups">
                <a
                  href="/facebook-groups"
                  className="flex h-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-navy shadow-sm ring-1 ring-black/5 hover:ring-pink"
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
                      Local vegan groups to share your events in.
                    </span>
                  </span>
                  <span aria-hidden className="text-xl">
                    →
                  </span>
                </a>
              </Pinnable>
            )}
        </div>
        {teamId && !q && (
          <div id="photo-hub" className="mt-6 scroll-mt-24">
            <CommunityPhotos teamId={teamId} />
          </div>
        )}
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
