// Role names and order. Safe to use in browser code.

// Roles, top to bottom. "member" means a profile with no role.
export type Access = "god" | "regional_lead" | "organiser" | "core_team";
export type ViewRole = Access | "member";

export const ROLE_LABEL: Record<ViewRole, string> = {
  god: "God Mode",
  regional_lead: "Regional Support Lead",
  organiser: "Organiser",
  core_team: "Core Team",
  member: "Member",
};

export const ROLE_RANK: Record<ViewRole, number> = {
  god: 4,
  regional_lead: 3,
  organiser: 2,
  core_team: 1,
  member: 0,
};
