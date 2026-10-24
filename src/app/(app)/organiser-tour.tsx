"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { finishOrganiserTour } from "@/app/actions";
import { TaskChooser } from "@/components/task-chooser";
import type { TaskSetup } from "@/lib/task-setup";

type Step = {
  section: number; // index into SECTIONS; -1 = the welcome card
  icon: string;
  tone: string;
  title: string;
  body: string;
  href?: string; // page to show for this card
  // Open a page linked from another one: on `on`, follow the first
  // data-tour="…" link in `link` (e.g. today's or the next event).
  follow?: { on: string; link: string };
  click?: string; // data-tour="…" button to press first (e.g. open a menu)
  whole?: boolean; // highlight all of it, even if it's tall
  choose?: boolean; // Next opens the action picker, then the tour carries on
  target?: string; // data-tour="…" element(s) to spotlight, first found wins
};

const TOUR_MINUTES = 5;

// The tour in a few bite-sized parts, so it doesn't feel like a wall of cards.
const SECTIONS = [
  { icon: "📅", name: "Events" },
  { icon: "🧑‍🤝‍🧑", name: "People" },
  { icon: "📝", name: "Actions" },
];

// Welcome tour for new organisers. Ends by asking how much time they have
// and choosing their follow-up tasks.
export function OrganiserTour({
  firstName,
  communityName,
  setup,
}: {
  firstName: string;
  communityName: string;
  setup: TaskSetup;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [choosing, setChoosing] = useState(false);
  const [i, setI] = useState(0);
  const pathname = usePathname();
  // Where the highlighted element is on screen (null = no spotlight).
  // rect null = looked and couldn't find it (show the big card instead).
  const [spot, setSpot] = useState<{
    key: string;
    rect: DOMRect | null;
  } | null>(null);
  // Pages already opened for the current card (so redirects like
  // Events → Calendar don't loop); cleared when the card changes.
  const pushed = useRef({ step: -1, keys: new Set<string>() });

  const steps: Step[] = [
    {
      section: -1,
      icon: "👋",
      tone: "bg-pink",
      title: `Welcome, ${firstName}!`,
      body: `You're now an organiser for ${communityName}. The tour has three short parts: your events, your people, and your actions.`,
    },
    {
      section: 0,
      icon: "📅",
      tone: "bg-cyan",
      title: "Events come in by themselves",
      href: "/",
      target: "today-event,next-event",
      body: "Your events are copied from activism.wtf automatically, so you never have to type them in. Tap “activism.wtf ↗” on any event to open it on the We The Free website.",
    },
    {
      section: 0,
      icon: "🗓️",
      tone: "bg-yellow",
      title: "List or calendar",
      href: "/calendar",
      target: "view-switch",
      body: "Calendar shows the whole month at a glance. List puts today's event at the top, with the next one just below. Switch between them here.",
    },
    {
      section: 0,
      icon: "🗺️",
      tone: "bg-cyan",
      title: "Nearby communities",
      href: "/calendar",
      target: "distance-slider",
      body: "The calendar can show other communities' events too. Slide to see just yours, nearby ones, your region or everywhere. Their events open on activism.wtf.",
    },
    {
      section: 0,
      icon: "✅",
      tone: "bg-pink",
      title: "Attendance in 60 seconds",
      follow: { on: "/", link: "today-event,next-event" },
      target: "checkin-list",
      body: "On the day, open the event and tap names as people arrive. The people most likely to come are at the top, and someone new is one tap away.",
    },
    {
      section: 0,
      icon: "🙌",
      tone: "bg-cyan",
      title: "Hand it off",
      href: "/",
      target: "helper-qr",
      body: "Busy running the event? A volunteer can scan the Helper QR and check people in from their own phone.",
    },
    {
      section: 0,
      icon: "📊",
      tone: "bg-yellow",
      title: "Insights",
      href: "/insights",
      target: "insights-table,nav-insights",
      body: "See who's been coming to events, who's new, who hasn't been in a while, and upcoming milestones like someone's 10th event.",
    },
    {
      section: 1,
      icon: "🧑‍🤝‍🧑",
      tone: "bg-cyan",
      title: "People",
      href: "/people",
      target: "people-search",
      body: "Add a name and that's it. Members can add their own details and photo when they connect with their QR code, or you can add their phone number or Facebook link for them.",
    },
    {
      section: 1,
      icon: "💬",
      tone: "bg-yellow",
      title: "Reach out in one tap",
      href: "/people",
      target: "people-list",
      body: "WhatsApp and Messenger buttons sit next to anyone with a phone number or Facebook link.",
    },
    {
      section: 1,
      icon: "📶",
      tone: "bg-cyan",
      title: "Engagement at a glance",
      href: "/people",
      target: "engagement-bar,people-list",
      body: "The little bars show how engaged each person is, from red (rarely comes) to green (comes a lot), out of 10. An arrow means it's gone up or down a lot in the last two months. Hover over a bar to see the score.",
    },
    {
      section: 1,
      icon: "🤝",
      tone: "bg-pink",
      title: "Build your crew",
      href: "/people",
      click: "role-button",
      target: "sheet",
      whole: true,
      body: "Tap + Role next to anyone to make them an Organiser or Core Team member, even before they've connected. The role switches on when they join.",
    },
    {
      section: 1,
      icon: "🌱",
      tone: "bg-cyan",
      title: "New member support",
      follow: { on: "/people", link: "person-ringo" },
      target: "buddy-section",
      body: "Ringo is a first-timer, so on his profile George was picked to support him. George checks in and invites him back. Switch on New member support on a welcoming member's profile to add them to this list.",
    },
    {
      section: 2,
      icon: "📝",
      tone: "bg-yellow",
      title: "Pick your actions",
      href: "/tasks",
      target: "choose-tasks,nav-actions",
      body: "Actions are the regular jobs that keep a community growing. Tell us how much time you have each week and we'll suggest which ones to switch on. You'll pick yours at the end of the tour.",
    },
    {
      section: 2,
      icon: "✔️",
      tone: "bg-cyan",
      title: "Your action list",
      href: "/tasks",
      target: "task-group,tasks-head",
      body: "Actions appear around each event on the Actions page, each with a time estimate. Tick them off as you go.",
    },
    {
      section: 2,
      icon: "📆",
      tone: "bg-yellow",
      title: "Promote your event",
      href: "/tasks",
      target: "task-facebook_event,tasks-head",
      body: "Two weeks before, an action shows up to create the Facebook event. We copy the details for you, so you just paste them into Facebook.",
    },
    {
      section: 2,
      icon: "📣",
      tone: "bg-pink",
      title: "Share in local Facebook groups",
      href: "/tasks",
      target: "task-promote_facebook_groups,fb-groups-link",
      body: "We keep a database of over 600 local vegan Facebook groups. A week before each event, tap “Open all” and every group near you opens in its own tab, ready to post. One click, every group.",
    },
    {
      section: 2,
      icon: "🚓",
      tone: "bg-cyan",
      title: "Police approval in two taps",
      href: "/tasks",
      target: "task-approval_submitted,tasks-head",
      body: "For outreach events, an action shows up three weeks before to notify the police. Tap Fill in & send: we fill in the form from the event and your saved details, and email it to the police for you, with you CC'd.",
    },
    {
      section: 2,
      icon: "🙋",
      tone: "bg-yellow",
      title: "Hand actions to your crew",
      href: "/tasks",
      click: "delegate-button",
      target: "sheet",
      whole: true,
      body: "Tap Delegate on any action and pick who'll do it, just this once or every time. They get a notification and see it on their page.",
    },
    {
      section: 2,
      icon: "🔔",
      tone: "bg-cyan",
      title: "Notifications",
      href: "/tasks",
      click: "bell",
      target: "bell-menu",
      body: "The bell keeps you in the loop: actions due, newcomers, and what your Core Team has picked up.",
    },
    {
      section: 2,
      icon: "📝",
      tone: "bg-yellow",
      title: "Set up your actions",
      href: "/tasks",
      target: "choose-tasks,nav-actions",
      choose: true,
      body: "Last step: tell us how much time you have and pick which actions you want for your community. You can change them any time.",
    },
  ];

  const minutesLeft = (from: number) => {
    // The whole tour is billed as 5 minutes; count down in proportion to
    // how much is left to read (plus the task picker).
    const weight = (n: number) =>
      steps
        .slice(n)
        .reduce(
          (w, st) => w + `${st.title} ${st.body}`.split(/\s+/).length + 15,
          0,
        ) + 120;
    return Math.max(1, Math.ceil((TOUR_MINUTES * weight(from)) / weight(0)));
  };

  // Take them to the card's page, then find and spotlight its element.
  const step0 = steps[i];
  const active = open && !choosing;
  const href = active ? step0.href : undefined;
  const follow = active ? step0.follow : undefined;
  const followOn = follow?.on;
  const followLink = follow?.link;
  const target = active ? step0.target : undefined;
  const whole = !!step0.whole;
  useEffect(() => {
    if (pushed.current.step !== i)
      pushed.current = { step: i, keys: new Set() };
    const go = (to: string) => {
      if (pushed.current.keys.has(to)) return;
      pushed.current.keys.add(to);
      router.push(to);
    };
    if (href && pathname !== href) go(href);
    if (!followOn || !followLink) return;
    // Already on the followed page (one we opened for this card)?
    if (pathname !== followOn && pushed.current.keys.has(pathname)) return;
    if (pathname !== followOn) return go(followOn);
    let tries = 0;
    const look = window.setInterval(() => {
      // Only links inside the Hub (never e.g. the activism.wtf link).
      const link = followLink
        .split(",")
        .map((k) =>
          [
            ...document.querySelectorAll<HTMLAnchorElement>(
              `a[data-tour="${k}"], [data-tour="${k}"] a`,
            ),
          ]
            // The card's main link (not e.g. its "N actions" link)…
            .sort(
              (x, y) =>
                Number(y.hasAttribute("data-follow")) -
                Number(x.hasAttribute("data-follow")),
            )
            .find((el) => el.getAttribute("href")?.startsWith("/")),
        )
        .find(Boolean);
      if (link?.getAttribute("href")) {
        window.clearInterval(look);
        go(link.getAttribute("href")!);
      } else if (++tries > 25) window.clearInterval(look);
    }, 120);
    return () => window.clearInterval(look);
  }, [i, href, followOn, followLink, pathname, router]);
  // Some cards press a button first (like opening the role menu), and close
  // what it opened when you move on.
  const click = active ? step0.click : undefined;
  useEffect(() => {
    if (!click) return;
    let tries = 0;
    const press = window.setInterval(() => {
      const btn = document.querySelector<HTMLElement>(`[data-tour="${click}"]`);
      if (btn) {
        window.clearInterval(press);
        btn.scrollIntoView({ block: "center" });
        btn.click();
      } else if (++tries > 25) window.clearInterval(press);
    }, 150);
    return () => {
      window.clearInterval(press);
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    };
  }, [click, pathname]);

  // Only trust a measurement taken for this card on this page.
  const spotKey = `${target}|${pathname}`;
  const found = target && spot?.key === spotKey ? spot : null;
  const rect = found?.rect ?? null;
  // Still finding the highlight: show nothing for a moment rather than
  // flashing the big centred card.
  const searching = !!target && !found;
  useEffect(() => {
    let el: Element | null = null;
    let tries = 0;
    const measure = () => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Long lists: just the top part, leaving room for the card.
      const cap = whole ? Infinity : window.innerHeight * 0.45;
      const rect = r.height > cap ? new DOMRect(r.x, r.y, r.width, cap) : r;
      if (r.width || r.height) setSpot({ key: spotKey, rect });
    };
    const find = window.setInterval(() => {
      const found =
        target
          ?.split(",")
          .map((t) => document.querySelector(`[data-tour="${t}"]`))
          .find((e) => e && e.getBoundingClientRect().height > 0) ?? null;
      if (found && found.getBoundingClientRect().height > 0) {
        window.clearInterval(find);
        el = found;
        const tall =
          !whole &&
          found.getBoundingClientRect().height > window.innerHeight * 0.45;
        el.scrollIntoView({
          block: tall ? "start" : "center",
          inline: "center",
        });
        window.setTimeout(measure, 350);
      } else if (++tries > 25) {
        window.clearInterval(find);
        setSpot({ key: spotKey, rect: null });
      }
    }, 120);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearInterval(find);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [target, spotKey, whole]);

  function finish() {
    setOpen(false);
    setChoosing(false);
    // Straight to the Events page, where "Get your community ready" waits.
    finishOrganiserTour().then(() => {
      router.push("/?setup=1");
      router.refresh();
    });
  }

  if (choosing) {
    return (
      <TaskChooser
        setup={setup}
        communityName={communityName}
        onClose={() => {
          // Picked mid-tour: carry on with the next card.
          if (i < steps.length - 1) {
            setChoosing(false);
            setI(i + 1);
          } else finish();
        }}
      />
    );
  }
  if (!open) return null;
  const step = steps[i];
  const last = i === steps.length - 1;
  const nextLabel = step.choose
    ? "Choose my actions"
    : last
      ? "Finish"
      : steps[i + 1].section !== step.section
        ? `${i === 0 ? "Start with" : "Next:"} ${SECTIONS[steps[i + 1].section].name}`
        : "Next";

  // Spotlighting something: a small card tucked next to it, so the page
  // stays visible.
  if (searching)
    return (
      <div
        aria-hidden
        className="fixed inset-0 z-[60]"
        style={{ background: "rgb(15 23 42 / 0.6)" }}
      />
    );

  if (rect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(320, vw - 24);
    const room = 210; // roughly the card's height
    const sideTop = Math.min(Math.max(12, rect.top), vh - room - 12);
    // Below, above, then beside the highlight; if none fit, the bottom.
    const place: React.CSSProperties =
      vh - rect.bottom - 14 >= room
        ? { top: rect.bottom + 14 }
        : rect.top - 14 >= room
          ? { bottom: vh - rect.top + 14 }
          : vw - rect.right - 20 >= width
            ? { top: sideTop, left: rect.right + 20 }
            : rect.left - 20 >= width
              ? { top: sideTop, left: rect.left - 20 - width }
              : { bottom: 12 };
    const left =
      place.left ?? Math.min(Math.max(12, rect.left), vw - width - 12);
    const inSection = steps.filter((st) => st.section === step.section);
    return (
      <div className="fixed inset-0 z-[60]">
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-2xl ring-2 ring-pink transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgb(15 23 42 / 0.6)",
          }}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Organiser welcome tour"
          className="fixed rounded-2xl bg-background p-4 text-left shadow-2xl ring-1 ring-black/5"
          style={{ ...place, left, width }}
        >
          <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
            <span>
              <span className="font-semibold text-navy">
                {SECTIONS[step.section]?.name} {inSection.indexOf(step) + 1}/
                {inSection.length}
              </span>{" "}
              · ~{minutesLeft(i)} min left
            </span>
            <button
              onClick={finish}
              className="rounded px-1 py-0.5 hover:bg-black/5 hover:text-stone-700"
            >
              Skip
            </button>
          </div>
          <h2 className="mt-1.5 font-semibold tracking-tight">
            <span aria-hidden className="mr-1">
              {step.icon}
            </span>
            {step.title}
          </h2>
          <p className="mt-1 text-sm leading-snug text-stone-600">
            {step.body}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => setI(i - 1)}
              className="rounded-lg px-2 py-1 text-sm font-medium text-stone-500 hover:bg-black/5"
            >
              Back
            </button>
            <button
              onClick={() =>
                step.choose ? setChoosing(true) : last ? finish() : setI(i + 1)
              }
              className="rounded-xl bg-pink px-4 py-1.5 text-sm font-semibold text-navy hover:bg-pink-strong"
            >
              {nextLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-navy/70 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Organiser welcome tour"
        className="relative w-full rounded-t-3xl bg-background p-6 pb-8 text-center sm:max-w-sm sm:rounded-3xl"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-semibold text-stone-600">
            ⏱ {i === 0 ? "About" : "~"} {minutesLeft(i)} min
            {i === 0 ? "" : " left"}
          </span>
          <button
            onClick={finish}
            className="rounded-lg px-2 py-1 text-stone-500 hover:bg-black/5"
          >
            Skip tour
          </button>
        </div>
        {/* The parts of the tour: done ones ticked, the current one filled. */}
        <ol className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold">
          {SECTIONS.map((sec, n) => {
            const done = step.section > n;
            const here = step.section === n;
            const inSection = steps.filter((st) => st.section === n);
            const pos = inSection.indexOf(step) + 1;
            return (
              <li key={sec.name} className="flex items-center gap-1.5">
                {n > 0 && (
                  <span
                    aria-hidden
                    className={`h-px w-3 ${done || here ? "bg-pink" : "bg-stone-300"}`}
                  />
                )}
                <button
                  type="button"
                  onClick={() =>
                    setI(steps.findIndex((st) => st.section === n))
                  }
                  aria-current={here ? "step" : undefined}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 ring-1 transition-colors ${
                    here
                      ? "bg-navy text-white ring-navy"
                      : done
                        ? "bg-pink/20 text-navy ring-pink/40"
                        : "bg-white text-stone-500 ring-stone-300"
                  }`}
                >
                  <span aria-hidden>{done ? "✓" : sec.icon}</span>
                  {sec.name}
                  {here && (
                    <span className="font-normal text-white/70">
                      {pos}/{inSection.length}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
        <div
          className={`mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-3xl text-4xl ${step.tone}`}
        >
          <span aria-hidden>{step.icon}</span>
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-tight">
          {step.title}
        </h2>
        <p className="mt-2 text-stone-600">{step.body}</p>
        <div className="mt-6 flex gap-2">
          {i > 0 && (
            <button
              onClick={() => setI(i - 1)}
              className="rounded-xl px-4 py-3 font-semibold text-stone-600 ring-1 ring-stone-300 hover:bg-stone-50"
            >
              Back
            </button>
          )}
          <button
            onClick={() =>
              step.choose ? setChoosing(true) : last ? finish() : setI(i + 1)
            }
            className="flex-1 rounded-xl bg-pink px-4 py-3 font-semibold text-navy hover:bg-pink-strong"
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
