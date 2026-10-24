// Calendar files (.ics) and Google Calendar links for events.
export type CalEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  address: string | null;
  description: string | null;
  url: string | null;
};

const stamp = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
const esc = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/[,;]/g, (c) => `\\${c}`);
// Lines over 75 characters are folded, as the format asks.
function fold(line: string) {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    let cut = 73;
    if (rest[cut - 1] === "\\") cut--; // never split an escape like \,
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  parts.push(rest);
  return parts.join("\r\n ");
}
const end = (e: CalEvent) =>
  e.ends_at ?? new Date(Date.parse(e.starts_at) + 3 * 36e5).toISOString();
const where = (e: CalEvent) => [e.venue, e.address].filter(Boolean).join(", ");
const notes = (e: CalEvent) =>
  [e.url, e.description?.slice(0, 1500)].filter(Boolean).join("\n\n");

export function icsFor(events: CalEvent[], name: string) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//We The Free//Movement Hub//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(name)}`,
  ];
  const now = stamp(new Date().toISOString());
  for (const e of events)
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@movement-hub`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(e.starts_at)}`,
      `DTEND:${stamp(end(e))}`,
      `SUMMARY:${esc(e.title)}`,
      ...(where(e) ? [`LOCATION:${esc(where(e))}`] : []),
      ...(notes(e) ? [`DESCRIPTION:${esc(notes(e))}`] : []),
      ...(e.url ? [`URL:${e.url}`] : []),
      "END:VEVENT",
    );
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarLink(e: CalEvent) {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${stamp(e.starts_at)}/${stamp(end(e))}`,
    details: notes(e),
    location: where(e),
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}
