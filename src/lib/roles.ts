// Role names and order. Safe to use in browser code.

// Roles, top to bottom. "member" means a profile with no role.
export type Access = "god" | "regional_lead" | "organiser" | "core_team";
export type ViewRole = Access | "member";

export const ROLE_LABEL: Record<ViewRole, string> = {
  god: "God Mode",
  regional_lead: "Regional Support Lead",
  organiser: "Organiser",
  core_team: "Core Team",
  member: "Attendee",
};

export const ROLE_RANK: Record<ViewRole, number> = {
  god: 4,
  regional_lead: 3,
  organiser: 2,
  core_team: 1,
  member: 0,
};

// Which roles each role can give out (always roles below their own).
export const GIVES: Record<ViewRole, Access[]> = {
  god: ["regional_lead", "organiser", "core_team"],
  regional_lead: ["organiser", "core_team"],
  organiser: ["core_team"],
  core_team: [],
  member: [],
};

// Plain-English explanation of each role, for pickers and the Roles page.
export const ROLE_INFO: Record<
  ViewRole,
  { summary: string; can: string[]; cannot?: string }
> = {
  god: {
    summary: "Full access to every team and region.",
    can: [
      "Everything in the app, everywhere",
      "Gives Regional Support Lead roles",
      "Can preview the app as any role",
    ],
  },
  regional_lead: {
    summary: "Looks after every team in their region.",
    can: [
      "Everything an Organiser can do, for every team in the region",
      "Switches between those teams",
      "Gives Organiser and Core Team roles",
    ],
  },
  organiser: {
    summary: "Runs one team.",
    can: [
      "Events, attendance, people and insights for the team",
      "Sees attendees' contact details",
      "Gives Core Team roles and manages buddies",
    ],
  },
  core_team: {
    summary: "Helps take attendance at their team's events.",
    can: [
      "Logs in and opens today's event straight away",
      "Ticks people in and adds newcomers at the door",
    ],
    cannot: "Sees names only: no contact details, People list or Insights.",
  },
  member: {
    summary: "Comes to events.",
    can: ["Has their own profile and event history"],
  },
};

export const ROLE_ACCENT: Record<ViewRole, string> = {
  god: "border-navy",
  regional_lead: "border-pink",
  organiser: "border-cyan",
  core_team: "border-yellow",
  member: "border-stone-300",
};
