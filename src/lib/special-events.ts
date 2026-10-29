// Special events (Halloween Movie Challenge, Christmas social...) suggested to
// organisers a while before the date. Set by God (anywhere) and Regional
// Support Leads (their region).

// activism.wtf's page for creating an event. "Plan it" opens this.
export const NEW_EVENT_URL = "https://mystats.wtf/events/new";

export type Suggestion = {
  id: string;
  name: string;
  blurb: string | null;
  link: string | null;
  date: string; // yyyy-mm-dd
  days: number;
  year: number;
  planning: boolean | null;
  region: string | null;
  region_count: number;
  world_count: number;
};

export type SpecialEvent = {
  id: string;
  name: string;
  blurb: string | null;
  link: string | null;
  month: number | null;
  day: number | null;
  next_date: string | null;
  lead_days: number;
  region_ids: string[] | null;
};

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

// "Sat 31 Oct" for a yyyy-mm-dd date.
export function shortDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function whenLabel(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 14) return `in ${days} days`;
  return `in ${Math.round(days / 7)} weeks`;
}

export function onBoardLine(s: Suggestion): string {
  const others = s.region_count - (s.planning ? 1 : 0);
  const world = s.world_count - (s.planning ? 1 : 0);
  if (world <= 0)
    return s.planning
      ? "You're the first team on board"
      : "Be the first team on board";
  const teams = (n: number) => `${n} ${n === 1 ? "team" : "teams"}`;
  const parts = [];
  if (others > 0 && s.region) parts.push(`${teams(others)} in ${s.region}`);
  parts.push(`${teams(world)} worldwide`);
  return `${s.planning ? "Also on board: " : "On board: "}${parts.join(" · ")}`;
}
