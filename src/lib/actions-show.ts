// Which actions an RSL who's also a community's organiser sees on Actions
// (Kai, 6 Nov 2026). Kept out of the client component so the server page can
// read the cookie name too.
export const SHOW_COOKIE = "wtf-actions-show";
export type ShowActions = "both" | "rsl" | "local";
