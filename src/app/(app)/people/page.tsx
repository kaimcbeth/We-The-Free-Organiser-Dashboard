import { requireOrganiser } from "@/lib/organiser";
import { PeopleList, type PersonRow } from "./people-list";

export default async function PeoplePage() {
  const { supabase, organiser } = await requireOrganiser();

  const { data } = await supabase
    .from("people")
    .select("id, first_name, last_name, suburb, email, phone, attendance(count)")
    .eq("team_id", organiser.team_id)
    .order("first_name")
    .returns<(Omit<PersonRow, "events"> & { attendance: { count: number }[] })[]>();

  const people: PersonRow[] = (data ?? []).map(({ attendance, ...p }) => ({
    ...p,
    events: attendance[0]?.count ?? 0,
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">People</h1>
      <p className="mt-1 text-sm text-stone-500">
        {people.length} {people.length === 1 ? "person" : "people"} in {organiser.team?.name ?? "your team"}
      </p>
      <PeopleList people={people} />
    </div>
  );
}
