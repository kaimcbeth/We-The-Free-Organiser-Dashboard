// Rain check (every 3 hours): for each upcoming event in the next 8 days,
// the highest hourly chance of rain while it's on and the total expected
// rain (mm), from Open-Meteo (free, no key) at the community's location.
// record_rain_forecast stores both on the event and makes a "Rain backup plan
// made" action when the chance is over 30% AND at least 1 mm is expected
// (Kai, 6 Nov 2026: 77% for 0.8 mm of drizzle wasn't worth a plan).

import { createClient } from "npm:@supabase/supabase-js@2";

type Ev = {
  id: string;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  team: { lat: number | null; lng: number | null; is_example: boolean; is_practice: boolean } | null;
};
type Forecast = {
  hourly?: { time: string[]; precipitation_probability: (number | null)[]; precipitation?: (number | null)[] };
};

const HOUR = 3600_000;

// Highest chance of rain and total rain (mm) in the hours the event covers.
export function rainDuring(f: Forecast, start: string, end: string | null) {
  const h = f.hourly;
  if (!h) return null;
  const from = Math.floor(Date.parse(start) / HOUR) * HOUR;
  const to = end ? Date.parse(end) : Date.parse(start) + 3 * HOUR;
  let max: number | null = null;
  let mm: number | null = null;
  for (let i = 0; i < h.time.length; i++) {
    const at = Date.parse(h.time[i] + "Z"); // timezone=GMT gives "2026-11-01T03:00"
    if (at < from || at >= to) continue;
    const p = h.precipitation_probability[i];
    if (p != null) max = Math.max(max ?? 0, p);
    const r = h.precipitation?.[i];
    if (r != null) mm = (mm ?? 0) + r;
  }
  return max == null ? null : { chance: max, mm: mm == null ? null : Math.round(mm * 10) / 10 };
}

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = Date.now();
  const { data, error } = await supabase
    .from("events")
    .select("id, starts_at, ends_at, venue, team:teams(lat, lng, is_example, is_practice)")
    .gt("starts_at", new Date(now + 2 * HOUR).toISOString())
    .lt("starts_at", new Date(now + 8 * 24 * HOUR).toISOString());
  if (error) return new Response(error.message, { status: 500 });

  const events = ((data ?? []) as unknown as Ev[]).filter(
    (e) =>
      e.team?.lat != null &&
      e.team.lng != null &&
      !e.team.is_example &&
      !e.team.is_practice &&
      !/\b(online|zoom|virtual)\b/i.test(e.venue ?? ""),
  );

  // One forecast per place; Open-Meteo takes many places in one request.
  const places = [...new Set(events.map((e) => `${e.team!.lat!.toFixed(3)},${e.team!.lng!.toFixed(3)}`))];
  const forecasts = new Map<string, Forecast>();
  for (let i = 0; i < places.length; i += 50) {
    const chunk = places.slice(i, i + 50);
    const url =
      "https://api.open-meteo.com/v1/forecast?hourly=precipitation_probability,precipitation&timezone=GMT&forecast_days=9" +
      `&latitude=${chunk.map((p) => p.split(",")[0]).join(",")}` +
      `&longitude=${chunk.map((p) => p.split(",")[1]).join(",")}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error("open-meteo", res.status, await res.text());
      continue;
    }
    const body = await res.json();
    const list: Forecast[] = Array.isArray(body) ? body : [body];
    chunk.forEach((p, j) => list[j] && forecasts.set(p, list[j]));
  }

  const rows = events.flatMap((e) => {
    const f = forecasts.get(`${e.team!.lat!.toFixed(3)},${e.team!.lng!.toFixed(3)}`);
    const r = f ? rainDuring(f, e.starts_at, e.ends_at) : null;
    return r == null ? [] : [{ event_id: e.id, chance: r.chance, mm: r.mm }];
  });

  const { data: made, error: rpcError } = await supabase.rpc("record_rain_forecast", { p_rows: rows });
  if (rpcError) return new Response(rpcError.message, { status: 500 });
  return Response.json({ events: events.length, places: places.length, checked: rows.length, actions: made });
});
