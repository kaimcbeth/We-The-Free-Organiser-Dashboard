// Things an organiser can pin to the top bar (Kai, 19 Nov 2026: "pin
// different things to the top bar like different parts of the resource hub").
export type NavPin = {
  key: string;
  label: string;
  href: string;
  match: string; // path prefix that marks it as the current page
  rsl?: boolean; // regional leads and God only
};

export const NAV_PINS: NavPin[] = [
  {
    key: "social",
    label: "Social Hub",
    href: "/resources/social",
    match: "/resources/social",
  },
  {
    key: "photos",
    label: "Photo Hub",
    href: "/resources#photo-hub",
    match: "/resources#photo-hub",
  },
  {
    key: "movie-player",
    label: "Movie player",
    href: "/resources/movie-player",
    match: "/resources/movie-player",
  },
  {
    key: "equipment",
    label: "Equipment",
    href: "/resources/equipment",
    match: "/resources/equipment",
  },
  {
    key: "prizes",
    label: "Prizes",
    href: "/resources/prizes",
    match: "/resources/prizes",
  },
  {
    key: "signs",
    label: "Sign splitter",
    href: "/resources/signs",
    match: "/resources/signs",
  },
  {
    key: "prompts",
    label: "Chat prompts",
    href: "/resources/prompts",
    match: "/resources/prompts",
  },
  {
    key: "fb-groups",
    label: "Facebook groups",
    href: "/facebook-groups",
    match: "/facebook-groups",
  },
  {
    key: "feedback",
    label: "Feedback inbox",
    href: "/feedback-inbox",
    match: "/feedback-inbox",
  },
  {
    key: "hangouts",
    label: "Hangouts",
    href: "/resources/hangouts",
    match: "/resources/hangouts",
    rsl: true,
  },
  { key: "chats", label: "Chats", href: "/chats", match: "/chats", rsl: true },
];

export const MAX_PINS = 4;

export function pinsFor(keys: string[], rsl: boolean): NavPin[] {
  return keys
    .map((k) => NAV_PINS.find((p) => p.key === k))
    .filter((p): p is NavPin => !!p && (!p.rsl || rsl));
}
