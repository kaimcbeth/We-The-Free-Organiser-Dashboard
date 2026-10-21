// Role names and order. Safe to use in browser code.

// Roles, top to bottom.
//   member     has an account but no role
//   attendee   has been to events but has no account
//   new_member only for God Mode's "View as": a member seeing the tutorial
export type Access = "god" | "regional_lead" | "organiser" | "core_team";
export type ViewRole = Access | "member" | "new_member" | "attendee";

export const ROLE_LABEL: Record<ViewRole, string> = {
  god: "God Mode",
  regional_lead: "Regional Support Lead",
  organiser: "Organiser",
  core_team: "Core Team",
  member: "Member",
  new_member: "New member",
  attendee: "Attendee",
};

export const ROLE_RANK: Record<ViewRole, number> = {
  god: 4,
  regional_lead: 3,
  organiser: 2,
  core_team: 1,
  member: 0,
  new_member: 0,
  attendee: -1,
};

// Which roles each role can give out (always roles below their own).
export const GIVES: Record<ViewRole, Access[]> = {
  god: ["regional_lead", "organiser", "core_team"],
  regional_lead: ["organiser", "core_team"],
  organiser: ["core_team"],
  core_team: [],
  member: [],
  new_member: [],
  attendee: [],
};

// Plain-English explanation of each role, for pickers and the Roles page.
export const ROLE_INFO: Record<
  ViewRole,
  { summary: string; can: string[]; cannot?: string }
> = {
  god: {
    summary: "Full access to every community and region.",
    can: [
      "Everything in the app, everywhere",
      "Gives Regional Support Lead roles",
      "Can preview the app as any role",
    ],
  },
  regional_lead: {
    summary: "Looks after every community in their region.",
    can: [
      "Everything an Organiser can do, for every community in the region",
      "Switches between those communities",
      "Gives Organiser and Core Team roles",
    ],
  },
  organiser: {
    summary: "Runs one community.",
    can: [
      "Events, attendance, people and insights for the community",
      "Sees attendees' contact details",
      "Gives Core Team roles and manages New member support",
    ],
  },
  core_team: {
    summary: "Helps take attendance at their community's events.",
    can: [
      "Logs in and opens today's event straight away",
      "Ticks people in and adds newcomers at the door",
    ],
    cannot: "Sees names only: no contact details, People list or Insights.",
  },
  member: {
    summary: "Has made an account.",
    can: [
      "Sees their own events, outreach count and milestones",
      "Adds their own details and photo",
    ],
  },
  new_member: {
    summary: "A member who has just joined (sees the tutorial).",
    can: ["Sees their own events, outreach count and milestones"],
  },
  attendee: {
    summary: "Has been to events but hasn't made an account yet.",
    can: ["Gets ticked in at events by the community"],
  },
};

export const ROLE_ACCENT: Record<ViewRole, string> = {
  god: "border-navy",
  regional_lead: "border-pink",
  organiser: "border-cyan",
  core_team: "border-yellow",
  member: "border-stone-300",
  new_member: "border-stone-300",
  attendee: "border-stone-200",
};

// "Add Sarah as a Core Team member", "Add Sarah as an Organiser".
export function addAsLabel(name: string, role: Access): string {
  if (role === "core_team") return `Add ${name} as a Core Team member`;
  if (role === "organiser") return `Add ${name} as an Organiser`;
  return `Add ${name} as a ${ROLE_LABEL[role]}`;
}
