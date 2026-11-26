"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { RESOURCE_SECTIONS, RESOURCES_COMING_SOON } from "@/lib/resources";
import { CommunityPhotos } from "@/components/community-photos";
import Link from "next/link";
import { Pinnable } from "@/components/nav-pins-context";
import { GuideShare } from "@/components/guide-share";
import { FeedbackCards } from "@/components/feedback-cards";
import { PodShareButton } from "@/components/engagement-pod";
import { SOCIAL_POSTS, slideUrl } from "@/lib/social-posts";
import { DISCUSSION_PROMPTS } from "@/lib/discussion-prompts";
import { NewTag, SeenProvider } from "@/components/new-tag";
import { RESOURCE_CARD, ResourceCardBody } from "@/components/resource-card";

const has = (q: string, ...text: (string | undefined)[]) =>
  !q || text.some((t) => t?.toLowerCase().includes(q));

// The Resources & Training page (organisers and the Core Team).
export function ResourcesList({
  teamId,
  teamSlug,
  rsl = false,
  pdrs = false,
  manager = false,
}: {
  teamId: string | null;
  teamSlug: string | null;
  isGod?: boolean; // (unused now: Facebook groups is for all organisers)
  rsl?: boolean; // Regional Support Lead or God: the hangout builder
  pdrs?: boolean; // runs RSL PDRs (community manager's switch, 0256)
  manager?: boolean; // God or Community Manager: meeting planner
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
          {manager &&
            !core &&
            has(
              q,
              "meeting planner time zones schedule global support team call promote world times",
            ) && (
              <a
                href="/resources/meetings"
                data-resource="meetings"
                className={RESOURCE_CARD}
              >
                <ResourceCardBody
                  emoji="🌏"
                  title="Meeting planner"
                  newKey="meetings"
                  about="Times around the world, a message and a graphic."
                />
              </a>
            )}
          {pdrs &&
            !core &&
            has(
              q,
              "pdr performance development review rsl regional support lead appraisal goals",
            ) && (
              <Link href="/pdr" data-resource="pdrs" className={RESOURCE_CARD}>
                <ResourceCardBody
                  emoji="📋"
                  title="RSL PDRs"
                  newKey="pdrs"
                  about="Start, prepare and sign off RSL reviews."
                />
              </Link>
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
                  className={RESOURCE_CARD}
                >
                  <ResourceCardBody
                    emoji="🗓️"
                    title="Organiser hangouts"
                    newKey="hangouts"
                    about="Build this month's hangout and present it."
                    pinned
                  />
                </a>
              </Pinnable>
            )}
          {has(
            q,
            "outreach guide conversation questions objections ibc qr newcomer",
          ) && (
            <div className={`relative ${RESOURCE_CARD}`}>
              <a href="/guide" className="block">
                <ResourceCardBody
                  emoji="💬"
                  title="Outreach guide"
                  about="The conversation questions, for between chats."
                />
              </a>
              {teamSlug && (
                <span className="mt-1">
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
              className={RESOURCE_CARD}
            >
              <ResourceCardBody
                emoji="🎓"
                title="IBC Masterclass"
                newKey="ibc"
                about="The full Inspiring Behaviour Change handout."
                external
              />
            </a>
          )}
          {has(
            q,
            "welcome mission values onboarding new members first event",
          ) && (
            <a href="/me/welcome" className={RESOURCE_CARD}>
              <ResourceCardBody
                emoji="👋"
                title="Welcome to We The Free"
                about="What new members see when they join."
              />
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
                  className={RESOURCE_CARD}
                >
                  <ResourceCardBody
                    emoji="🙌"
                    title="Engagement pod"
                    newKey="engagement-pod"
                    about="Get the pod to like and comment on a post."
                  />
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
                className={RESOURCE_CARD}
              >
                <ResourceCardBody
                  emoji={r.emoji}
                  title={r.title}
                  newKey={r.file}
                  tag={r.area}
                  about={r.about}
                  tip={r.tip}
                  external
                />
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
                className={RESOURCE_CARD}
              >
                <ResourceCardBody
                  emoji="🧰"
                  title="Equipment guide and inventory"
                  newKey="equipment"
                  tag="Australia"
                  about="Your kit, upgrades and where to buy them."
                  pinned
                />
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
                className={RESOURCE_CARD}
              >
                <ResourceCardBody
                  emoji="🍪"
                  title="Recommended prizes"
                  newKey="prizes"
                  tag="Australia"
                  about="Vegan treats for the Movie Challenge."
                  pinned
                />
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
                  className={RESOURCE_CARD}
                >
                  <ResourceCardBody
                    emoji="🎬"
                    title="Movie player"
                    newKey="movie-player"
                    about="Play the films offline and see their impact."
                    pinned
                  />
                </a>
              </Pinnable>
            )}
          {!path.startsWith("/attendance") &&
            has(
              q,
              "group chat discussion prompts questions whatsapp community",
            ) && (
              <Pinnable k="prompts">
                <a href="/resources/prompts" className={RESOURCE_CARD}>
                  <ResourceCardBody
                    emoji="💬"
                    title="Group chat discussion prompts"
                    about={`${DISCUSSION_PROMPTS.length} questions for your community chat.`}
                    pinned
                  />
                </a>
              </Pinnable>
            )}
          {!core &&
            has(q, "facebook fb groups promote local vegan community") && (
              <Pinnable k="fb-groups">
                <a href="/facebook-groups" className={RESOURCE_CARD}>
                  <ResourceCardBody
                    emoji="👥"
                    title="Facebook groups"
                    about="Local vegan groups to share your events in."
                    pinned
                  />
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
