// Movie Challenge events show the movie player's live laptop screen on their
// page from an hour before they start until an hour after they end.
const MOVIE = /movie challenge|3mmc/i;

export function showLivePlayers(
  title: string,
  startsAt: string,
  endsAt: string | null,
): boolean {
  if (!MOVIE.test(title)) return false;
  const now = Date.now();
  const start = new Date(startsAt).getTime();
  const end = endsAt ? new Date(endsAt).getTime() : start + 3 * 60 * 60 * 1000; // no end time: assume 3 hours
  const hour = 60 * 60 * 1000;
  return now >= start - hour && now <= end + hour;
}
