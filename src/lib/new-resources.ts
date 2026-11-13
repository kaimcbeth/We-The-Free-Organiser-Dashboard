// "New" tags on Resources (Kai, 13 Nov 2026): a card added in the last
// NEW_DAYS days shows a tag until that person opens it (resource_seen, 0235).
// Add a line here whenever a resource is added.

export const NEW_DAYS = 30;

export const RESOURCE_ADDED: Record<string, string> = {
  hangouts: "2026-11-13",
  equipment: "2026-11-11", // Build Your Kit
  social: "2026-11-05",
  "engagement-pod": "2026-11-05",
  "/resources/team-fundraising-guide-2025.pdf": "2026-11-05",
  ibc: "2026-10-31",
  prizes: "2026-10-30",
  "movie-player": "2026-10-30",
};

export function isFresh(key: string, today = new Date()) {
  const added = RESOURCE_ADDED[key];
  if (!added) return false;
  const days =
    (today.getTime() - new Date(`${added}T00:00:00`).getTime()) / 86400000;
  return days >= 0 && days < NEW_DAYS;
}
