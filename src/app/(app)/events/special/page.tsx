import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrganiser } from "@/lib/organiser";
import { todayInTz } from "@/lib/time";
import type { SpecialEvent } from "@/lib/special-events";
import { SpecialEventsEditor } from "./special-events-editor";

// Next date an event falls on (yyyy-mm-dd), on or after today.
function nextDate(e: SpecialEvent, today: string): string | null {
  if (e.month && e.day) {
    const y = Number(today.slice(0, 4));
    const fmt = (yr: number) =>
      `${yr}-${String(e.month).padStart(2, "0")}-${String(e.day).padStart(2, "0")}`;
    return fmt(y) >= today ? fmt(y) : fmt(y + 1);
  }
  return e.next_date && e.next_date >= today ? e.next_date : null;
}

export default async function SpecialEventsPage() {
  const { supabase, organiser } = await requireOrganiser();
  if (organiser.role !== "god" && organiser.role !== "regional_lead")
    redirect("/");
  const isGod = organiser.role === "god";
  const today = todayInTz();
  const [{ data: events }, { data: regions }] = await Promise.all([
    supabase
      .from("special_events")
      .select(
        "id, name, blurb, link, month, day, next_date, lead_days, region_ids",
      )
      .order("month", { nullsFirst: false })
      .order("day")
      .returns<SpecialEvent[]>(),
    supabase.from("regions").select("id, name").order("name"),
  ]);
  const list = (events ?? []).map((e) => ({
    ...e,
    on_date: nextDate(e, today),
  }));
  const onBoard = await Promise.all(
    list.map(async (e) =>
      e.on_date
        ? ((
            await supabase.rpc("special_event_teams", {
              p_event_id: e.id,
              p_year: Number(e.on_date.slice(0, 4)),
            })
          ).data as string[])
        : [],
    ),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-stone-500 hover:text-stone-800">
          ← Events
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Special events
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Suggested to organisers on their Events page a while before the date,
          as a faded card they can plan or hide. Teams can turn suggestions off.
          {isGod
            ? " Regional Support Leads can add their own for their region."
            : " You can add and change ones for your region."}
        </p>
      </div>
      <SpecialEventsEditor
        events={list.map((e, i) => ({ ...e, on_board: onBoard[i] ?? [] }))}
        regions={regions ?? []}
        isGod={isGod}
        myRegion={organiser.region_id}
      />
    </div>
  );
}
