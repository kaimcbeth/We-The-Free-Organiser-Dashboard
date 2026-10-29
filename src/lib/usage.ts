// Which part of the app a page belongs to, for the God Mode usage page.
// First match wins, so more specific paths go first.
const SECTIONS: [RegExp, string][] = [
  [/^\/$/, "Home (organiser)"],
  [/^\/events/, "Events"],
  [/^\/calendar/, "Calendar"],
  [/^\/tasks/, "Actions"],
  [/^\/people/, "People"],
  [/^\/insights/, "Insights"],
  [/^\/resources\/equipment/, "Equipment guide"],
  [/^\/resources/, "Resources"],
  [/^\/funding/, "Funding"],
  [/^\/whats-new/, "What's new"],
  [/^\/roles/, "Roles"],
  [/^\/facebook-groups/, "FB groups"],
  [/^\/attendance\/tasks/, "Core Team: actions"],
  [/^\/attendance\/resources/, "Core Team: resources"],
  [/^\/attendance/, "Core Team: attendance"],
  [/^\/me\/photos/, "Member: Photo Hub"],
  [/^\/me\/welcome/, "Member: Welcome"],
  [/^\/me\/guide/, "Member: Outreach guide"],
  [/^\/me/, "Member: my page"],
  [/^\/guide/, "Outreach guide"],
  [/^\/checkin/, "Check-in"],
  [/^\/feedback/, "Feedback form"],
  [/^\/approvals/, "Approvals"],
  [/^\/notifications/, "Notifications"],
  [/^\/(join|invite|invites)/, "Join / invites"],
];

export function sectionOf(path: string): string | null {
  if (/^\/(login|auth|usage|test-accounts)/.test(path)) return null;
  if (path.startsWith("/checkin/zz")) return null;
  for (const [re, name] of SECTIONS) if (re.test(path)) return name;
  return null;
}

export type UsageSection = {
  section: string;
  views: number;
  people: number;
  by_who: Record<string, number>;
  last_at: string;
};
export type UsageSummary = {
  sections: UsageSection[];
  daily: { day: string; views: number; people: number }[];
  people: number;
  views: number;
  since: string | null;
};
