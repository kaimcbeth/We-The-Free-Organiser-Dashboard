// Newcomers stay newcomers (onboarding ramp, someone supporting them) until
// they've been to this many events. Their very first event makes them a
// "First-timer". People marked "came before the app" are never either.
export const NEWCOMER_EVENTS = 5;

export const isNewcomer = (events: number, attendedBefore: boolean) =>
  !attendedBefore && events < NEWCOMER_EVENTS;
