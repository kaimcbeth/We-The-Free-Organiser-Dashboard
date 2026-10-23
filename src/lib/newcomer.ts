// Onboarding: someone is a Regular once they've come to REGULAR_EVENTS
// events within REGULAR_DAYS (any stretch of 3 months). Until then they're a
// Newcomer, and their very first event makes them a "First-timer". People
// marked "came before the app" are never newcomers.
export const REGULAR_EVENTS = 5;
export const REGULAR_DAYS = 90;
const DAY = 864e5;

// When they became a Regular (the event that did it), or null if not yet.
export function regularSince(eventDates: string[]): string | null {
  const t = eventDates
    .map((d) => [Date.parse(d), d] as const)
    .sort((a, b) => a[0] - b[0]);
  for (let i = REGULAR_EVENTS - 1; i < t.length; i++)
    if (t[i][0] - t[i - REGULAR_EVENTS + 1][0] <= REGULAR_DAYS * DAY)
      return t[i][1];
  return null;
}

export const isNewcomer = (eventDates: string[], attendedBefore: boolean) =>
  !attendedBefore && eventDates.length > 0 && !regularSince(eventDates);

// Events in the last 3 months (how far along the ramp they are now).
export const recentEvents = (eventDates: string[], now: number) =>
  eventDates.filter((d) => {
    const t = Date.parse(d);
    return t <= now && now - t <= REGULAR_DAYS * DAY;
  }).length;
