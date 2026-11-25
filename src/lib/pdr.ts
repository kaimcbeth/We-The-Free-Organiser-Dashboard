// Performance & Development Reviews for Regional Support Leads (Kai, 26 Nov
// 2026; 0256). Same sections as Kai's Word PDR, wording tidied. Answers and
// the reviewer's notes are stored as JSON on `pdrs`; this file is the shape.

export type PdrKind = "annual" | "mid_year";
export type PdrStatus = "invited" | "drafting" | "ready" | "meeting" | "signed";
export type ObjectiveStatus = "" | "achieved" | "partly" | "not";

export type Rating = number | "na" | null;
export type RatedRow = { rating: Rating; comment: string };

export type Answers = {
  objectives?: { text: string; status: ObjectiveStatus; comment: string }[];
  assessment?: Record<string, string>;
  job?: Record<string, RatedRow>;
  jobExtra?: string;
  team?: Record<string, RatedRow>;
  teamExtra?: string;
  development?: { skill: string; how: string; measure: string; date: string }[];
  goals?: { text: string; steps: string }[];
};

// Reviewer's side: a note per item key and their own rating per statement.
export type Notes = {
  text?: Record<string, string>;
  rating?: Record<string, Rating>;
};

export type OrgGoal = {
  label: string;
  target: number | null;
  metric: string | null;
  progress?: number | null;
};

export type PdrSummary = {
  id: string;
  kind: PdrKind;
  year: number;
  reviewee_id: string | null;
  reviewee_name: string;
  reviewee_email: string | null;
  region_id: string | null;
  region: string | null;
  reviewer_name: string | null;
  meeting_at: string | null;
  timezone: string;
  status: PdrStatus;
  submitted_at: string | null;
  notes_shared_at: string | null;
  reviewee_signed_at: string | null;
  reviewee_signed_name: string | null;
  reviewer_signed_at: string | null;
  reviewer_signed_name: string | null;
  locked_at: string | null;
  invite_sent_at: string | null;
  previous_id: string | null;
  created_at: string;
  updated_at: string;
  invite_token: string | null;
};

export type Pdr = PdrSummary & {
  role: "reviewer" | "reviewee";
  answers: Answers;
  notes: Notes | null;
  goals: OrgGoal[];
  previous: {
    id: string;
    kind: PdrKind;
    year: number;
    job: Record<string, RatedRow> | null;
    team: Record<string, RatedRow> | null;
    goals: { text: string }[] | null;
    development: Answers["development"] | null;
  } | null;
};

export const KIND_LABEL: Record<PdrKind, string> = {
  annual: "Annual review",
  mid_year: "Mid-year review",
};

export const STATUS_LABEL: Record<PdrStatus, string> = {
  invited: "Invite sent",
  drafting: "Drafting",
  ready: "Draft ready",
  meeting: "In the meeting",
  signed: "Signed off",
};

export const STATUS_STYLE: Record<PdrStatus, string> = {
  invited: "bg-stone-100 text-stone-700",
  drafting: "bg-yellow/40 text-navy",
  ready: "bg-cyan/30 text-navy",
  meeting: "bg-pink/30 text-navy",
  signed: "bg-navy text-white",
};

export const METRICS: { value: string; label: string }[] = [
  { value: "", label: "Typed by hand" },
  { value: "new_communities", label: "New communities (Hub)" },
  { value: "events", label: "Events held (Hub)" },
  { value: "check_ins", label: "Check-ins (Hub)" },
  { value: "films_watched", label: "Movie player views (Hub)" },
];

export const INTRO =
  "A PDR is a supportive conversation about how the year has gone and what's next: what you've achieved, what got in the way, how you're feeling in the role, and the goals and growth you want for the coming months. It isn't disciplinary. Fill in your draft before the meeting and we'll go through it together.";

export const KIND_INTRO: Record<PdrKind, string> = {
  annual:
    "Annual reviews happen in January and take about 2 hours: we look back at last year and set goals for this one.",
  mid_year:
    "Mid-year reviews happen in July and take about 1 hour: a check-in on how the year is going and any course corrections.",
};

export const ASSESSMENT: { key: string; label: string }[] = [
  { key: "well", label: "What went well, or what have you grown in?" },
  { key: "notWell", label: "What didn't go so well?" },
  { key: "why", label: "What helped or got in the way?" },
  { key: "growth", label: "Where would you like to grow?" },
];

export const JOB: { key: string; label: string }[] = [
  { key: "expectations", label: "I know what's expected of me." },
  {
    key: "more",
    label: "I want to take on more, or change my responsibilities.",
  },
  { key: "reduce", label: "I want to reduce my responsibilities." },
  { key: "support", label: "I get enough support." },
  { key: "opinion", label: "I feel my opinion matters." },
  { key: "recognition", label: "I get personal recognition and appreciation." },
  {
    key: "development",
    label: "I have chances for personal and professional development.",
  },
  { key: "environment", label: "I'm happy with my working environment." },
  { key: "equipment", label: "My equipment is enough for the work." },
  { key: "hours", label: "I'm happy with my hours." },
  { key: "pay", label: "My pay is enough (n/a if you're not paid)." },
  { key: "success", label: "I have personal successes in this role." },
  {
    key: "satisfied",
    label: "Overall, I'm satisfied working with We The Free.",
  },
  {
    key: "responds",
    label: "We The Free responds well to my wishes and expectations.",
  },
  { key: "balance", label: "I keep a good work–life balance." },
];

export const TEAM: { key: string; label: string }[] = [
  {
    key: "relationships",
    label:
      "I have positive, effective working relationships with my peers and anyone I support or mentor.",
  },
  {
    key: "culture",
    label: "I help build a positive team culture and support my team's growth.",
  },
  {
    key: "communication",
    label: "I communicate clearly and handle conflict well.",
  },
  {
    key: "challenges",
    label: "I work through challenges in collaboration and teamwork.",
  },
  { key: "proud", label: "I'm proud of what my team has achieved." },
  {
    key: "feedback",
    label: "I get feedback from peers or the people I support, and act on it.",
  },
  {
    key: "connections",
    label: "I take steps to strengthen relationships and team connections.",
  },
];

export const OBJECTIVE_STATUS: { value: ObjectiveStatus; label: string }[] = [
  { value: "achieved", label: "Achieved" },
  { value: "partly", label: "Partly" },
  { value: "not", label: "Not achieved" },
];

export function defaultKindYear(now = new Date()): {
  kind: PdrKind;
  year: number;
} {
  const m = now.getMonth(); // 0 = Jan
  if (m >= 4 && m <= 7) return { kind: "mid_year", year: now.getFullYear() };
  // Sept–Dec reviews look ahead to next year (Kai's "PDR 2027" in Dec 2026).
  return {
    kind: "annual",
    year: m >= 8 ? now.getFullYear() + 1 : now.getFullYear(),
  };
}

export function formatMeeting(iso: string | null, tz: string): string {
  if (!iso) return "No meeting date yet";
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
  return `${f} (${tz.split("/").pop()?.replace(/_/g, " ")} time)`;
}

export function ratingText(r: Rating | undefined): string {
  if (r === "na") return "n/a";
  if (r == null) return "–";
  return String(r);
}
