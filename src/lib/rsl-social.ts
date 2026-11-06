// RSL actions for the regional social media pages, shown in their own
// "Social media" section on Actions (Kai, 6 Nov 2026: "Make a specific social
// media subsection"). Anything else region-wide stays under "For your region".
export const RSL_SOCIAL_KINDS = new Set([
  "rsl_main_repost", // weekly: main page post reposted
  "rsl_region_recap", // monthly recap on the regional socials
  "rsl_meet_organisers", // monthly Meet the Organisers post
]);

export const isRslSocial = (kind: string) =>
  RSL_SOCIAL_KINDS.has(kind) || kind.startsWith("rsl_social_");
