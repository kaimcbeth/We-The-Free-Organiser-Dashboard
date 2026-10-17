import { requireOrganiser } from "@/lib/organiser";
import { PeopleList, type PersonRow } from "./people-list";

type Row = Omit<PersonRow, "events" | "connected"> & {
  user_id: string | null;
  attendance: { count: number }[];
};

export default async function PeoplePage() {
  const { supabase, organiser } = await requireOrganiser();

  const { data } = await supabase
    .from("people")
    .select("id, first_name, last_name, suburb, email, phone, user_id, attendance(count)")
    .eq("team_id", organiser.team_id)
    .order("first_name")
    .returns<Row[]>();

  const people: PersonRow[] = (data ?? []).map(({ attendance, user_id, ...p }) => ({
    ...p,
    connected: !!user_id,
    events: attendance[0]?.count ?? 0,
  }));
  const connected = people.filter((p) => p.connected).length;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">People</h1>
      <p className="mt-1 text-sm text-stone-500">
        {people.length} {people.length === 1 ? "person" : "people"} in {organiser.team?.name ?? "your team"} ·{" "}
        {connected} with an account
      </p>
      <PeopleList people={people} />
    </div>
  );
}
