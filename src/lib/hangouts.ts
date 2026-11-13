// Organiser hangout builder (Kai, 13 Nov 2026): Regional Support Leads plan a
// monthly one-hour organiser hangout from blocks (welcome, icebreakers,
// activities (section key "exercise"), announcements, wrap-up), then present it or export slides with
// speaker notes. Tables hangout_blocks + hangout_plans (0234).

export type Section =
  "welcome" | "icebreaker" | "exercise" | "announcements" | "closing";

export type Layout = "title" | "question" | "points" | "agenda";

export type SlideData = {
  layout: Layout;
  heading: string;
  body?: string;
  points?: string[];
  notes?: string;
};

export type Block = {
  id: string;
  key: string | null;
  region_id: string | null; // null = shared library
  section: Section;
  title: string;
  blurb: string | null;
  minutes: number;
  slides: SlideData[];
  sort_order: number;
};

// One block in a plan. `slides` is set when the block was changed for this
// hangout only (the library block stays as it is).
export type PlanItem = {
  uid: string;
  block: string;
  minutes: number;
  slides?: SlideData[];
};

export type Plan = {
  id: string;
  region_id: string;
  hangout_id: string | null;
  title: string;
  held_on: string | null; // yyyy-mm-dd
  items: PlanItem[];
  updated_at?: string;
};

export const HOUR = 60;

export const SECTIONS: {
  key: Section;
  label: string; // library tab
  one: string; // one block of it
  kicker: string; // on the slide
  colour: string;
  chip: string; // Tailwind classes
}[] = [
  {
    key: "welcome",
    label: "Welcome",
    one: "Welcome",
    kicker: "WELCOME",
    colour: "#2fd9df",
    chip: "bg-cyan/25 text-navy",
  },
  {
    key: "icebreaker",
    label: "Icebreakers",
    one: "Icebreaker",
    kicker: "ICEBREAKER",
    colour: "#ffd90f",
    chip: "bg-yellow/40 text-navy",
  },
  {
    key: "exercise",
    label: "Activities",
    one: "Activity",
    kicker: "ACTIVITY",
    colour: "#ff47b9",
    chip: "bg-pink/25 text-navy",
  },
  {
    key: "announcements",
    label: "Announcements",
    one: "Announcements",
    kicker: "ANNOUNCEMENTS",
    colour: "#2fd9df",
    chip: "bg-cyan/25 text-navy",
  },
  {
    key: "closing",
    label: "Wrap-up",
    one: "Wrap-up",
    kicker: "WRAP-UP",
    colour: "#ffd90f",
    chip: "bg-yellow/40 text-navy",
  },
];

export const sectionOf = (s: Section) =>
  SECTIONS.find((x) => x.key === s) ?? SECTIONS[0];

export const LAYOUTS: { key: Layout; label: string }[] = [
  { key: "question", label: "Big question" },
  { key: "points", label: "List" },
  { key: "title", label: "Title" },
  { key: "agenda", label: "Today's plan" },
];

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const planMinutes = (items: PlanItem[]) =>
  items.reduce((n, i) => n + (i.minutes || 0), 0);

// What the {placeholders} on slides turn into.
export type Fill = {
  region: string;
  month: string;
  nextHangout: string;
  special: string;
};

export function fillText(text: string, f: Fill) {
  return text
    .replaceAll("{region}", f.region)
    .replaceAll("{month}", f.month)
    .replaceAll("{next_hangout}", f.nextHangout || "to be announced")
    .replaceAll("{special}", f.special || "our next special event");
}

export function fmtDay(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function fmtWhen(iso: string, tz?: string) {
  return new Date(iso).toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });
}

// A slide ready to draw: the block's slide with placeholders filled in, and
// where it sits in the hangout.
export type DeckSlide = SlideData & {
  section: Section;
  blockTitle: string;
  minutes: number; // the block's minutes
  startsAt: number; // minutes into the hangout when its block starts
  itemUid: string;
  agenda?: { title: string; minutes: number; section: Section; at: number }[];
};

export function itemSlides(item: PlanItem, blocks: Map<string, Block>) {
  return item.slides ?? blocks.get(item.block)?.slides ?? [];
}

export function buildDeck(
  plan: Plan,
  blocks: Map<string, Block>,
  fill: Fill,
): DeckSlide[] {
  const agenda: DeckSlide["agenda"] = [];
  let at = 0;
  for (const item of plan.items) {
    const b = blocks.get(item.block);
    if (!b) continue;
    agenda.push({
      title: b.title,
      minutes: item.minutes,
      section: b.section,
      at,
    });
    at += item.minutes;
  }
  const out: DeckSlide[] = [];
  at = 0;
  for (const item of plan.items) {
    const b = blocks.get(item.block);
    if (!b) continue;
    for (const s of itemSlides(item, blocks)) {
      out.push({
        ...s,
        heading: fillText(s.heading ?? "", fill),
        body: s.body ? fillText(s.body, fill) : undefined,
        points: s.points?.map((p) => fillText(p, fill)),
        notes: s.notes ? fillText(s.notes, fill) : undefined,
        section: b.section,
        blockTitle: b.title,
        minutes: item.minutes,
        startsAt: at,
        itemUid: item.uid,
        agenda: s.layout === "agenda" ? agenda : undefined,
      });
    }
    at += item.minutes;
  }
  return out;
}

export const clock = (min: number) =>
  `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;

// When each block was last used in this region's other hangouts, so the
// library can flag it ("Used in October") and list it lower.
export function lastUsed(plans: Plan[], currentId: string | null) {
  const used = new Map<string, string>();
  for (const p of plans) {
    if (p.id === currentId) continue;
    const when = p.held_on ?? p.updated_at?.slice(0, 10) ?? "";
    for (const i of p.items) {
      const prev = used.get(i.block);
      if (!prev || when > prev) used.set(i.block, when);
    }
  }
  return used;
}

export function usedLabel(iso: string) {
  if (!iso) return "Used before";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return `Used in ${MONTHS[d.getMonth()]}${sameYear ? "" : ` ${d.getFullYear()}`}`;
}

// A new plan starts with the welcome and the announcements; the RSL adds
// icebreakers and activities from the library.
export function starterItems(blocks: Block[]): PlanItem[] {
  const pick = (key: string) => blocks.find((b) => b.key === key);
  return ["welcome", "announcements"]
    .map(pick)
    .filter((b): b is Block => !!b)
    .map((b) => ({ uid: uid(), block: b.id, minutes: b.minutes }));
}

export type Suggestions = {
  specials: { emoji: string | null; name: string; date: string }[];
  month: string;
  recap: { name: string; events: number; people: number; watched: number }[];
  hangouts: { id: string; title: string; starts_at: string; url: string }[];
};

// Ready-made lines for the Announcements slide (Kai: suggestions from the
// Hub, not filled in automatically).
export function announcementIdeas(
  s: Suggestions | null,
  heldOn: string | null,
) {
  if (!s) return [];
  const out: { label: string; text: string }[] = [];
  for (const e of s.specials.slice(0, 4)) {
    const text = `${e.emoji ? `${e.emoji} ` : ""}${e.name}: ${fmtDay(e.date)}`;
    out.push({ label: text, text });
  }
  const active = s.recap.filter((r) => r.events > 0);
  if (active.length) {
    const m = MONTHS[Number(s.month.slice(5, 7)) - 1];
    const sum = (k: "events" | "people" | "watched") =>
      s.recap.reduce((n, r) => n + r[k], 0);
    const bits = [
      `${sum("events")} events`,
      sum("people") ? `${sum("people")} people checked in` : "",
      sum("watched") ? `${sum("watched")} films watched` : "",
    ].filter(Boolean);
    const text = `${m} across the region: ${bits.join(", ")} in ${active.length} ${active.length === 1 ? "community" : "communities"}`;
    out.push({ label: text, text });
  }
  const after = heldOn ?? new Date().toISOString().slice(0, 10);
  const next = s.hangouts.find((h) => h.starts_at.slice(0, 10) > after);
  if (next) {
    const text = `Next hangout: ${fmtWhen(next.starts_at)}`;
    out.push({ label: text, text });
  }
  return out;
}

export function nextHangoutAfter(s: Suggestions | null, heldOn: string | null) {
  const after = heldOn ?? new Date().toISOString().slice(0, 10);
  const next = s?.hangouts.find((h) => h.starts_at.slice(0, 10) > after);
  return next ? fmtWhen(next.starts_at) : "";
}
