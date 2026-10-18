import type { NextRequest } from "next/server";
import { requireOrganiser } from "@/lib/organiser";
import { loadInsightData } from "@/lib/insights-data";
import { computeInsights, type PersonInsight } from "@/lib/insights";

const cell = (v: string | number | null | undefined) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows: (string | number | null)[][]) =>
  rows.map((r) => r.map(cell).join(",")).join("\r\n");
const day = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(
        new Date(iso),
      )
    : "";

const LISTS: Record<string, string> = {
  everyone: "Everyone",
  regulars: "Regulars",
  "one-timers": "Came once",
  drifted: "Drifted off",
  "milestones-soon": "Milestones coming up",
  "milestones-recent": "Recent milestones",
  monthly: "Monthly totals",
};

// CSV downloads for the Insights page (open in Google Sheets or Excel).
// Names only plus attendance numbers: no contact details.
export async function GET(request: NextRequest) {
  const list = request.nextUrl.searchParams.get("list") ?? "";
  if (!(list in LISTS)) return new Response("Unknown list", { status: 400 });

  const { supabase, organiser } = await requireOrganiser();
  const data = await loadInsightData(supabase, organiser.team_id);
  if (!data) return new Response("Couldn't load data", { status: 500 });
  const r = computeInsights(data.people, data.checkIns, data.events);

  let csv: string;
  if (list === "everyone") {
    csv = toCsv([
      [
        "Name",
        "Last event",
        "Events (3 months)",
        "Events (6 months)",
        "Events (12 months)",
        "Events (all time)",
        "Outreach events",
      ],
      ...r.everyone.map((p) => [
        p.name,
        day(p.lastSeen),
        p.m3,
        p.m6,
        p.m12,
        p.total,
        p.outreach,
      ]),
    ]);
  } else if (list === "monthly") {
    csv = toCsv([
      [
        "Month",
        "Events",
        "Check-ins",
        "Outreach check-ins",
        "People",
        "First-timers",
      ],
      ...r.months.map((m) => [
        m.label,
        m.events,
        m.checkIns,
        m.outreachCheckIns,
        m.people,
        m.firstTimers,
      ]),
    ]);
  } else {
    const people: PersonInsight[] = {
      regulars: r.regulars,
      "one-timers": r.oneTimers,
      drifted: r.drifted,
      "milestones-soon": r.milestoneSoon,
      "milestones-recent": r.milestoneRecent,
    }[list]!;
    csv = toCsv([
      [
        "Name",
        "Events",
        "Outreach events",
        "First event",
        "Last event",
        "Note",
      ],
      ...people.map((p) => [
        p.name,
        p.events,
        p.outreach,
        day(p.firstSeen),
        day(p.lastSeen),
        p.detail,
      ]),
    ]);
  }

  const team = (organiser.team?.slug ?? "team").replace(/[^a-z0-9-]/gi, "");
  const today = day(new Date().toISOString());
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wtf-${team}-${list}-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
