import { requireOrganiser } from "@/lib/organiser";
import { signPhotos } from "@/lib/photos";
import { LoadError } from "@/components/load-error";
import { PeopleList, type PersonRow } from "./people-list";

type Row = Omit<PersonRow, "events" | "connected" | "photoUrl"> & {
  user_id: string | null;
  photo_updated_at: string | null;
  attendance: { count: number }[];
};

export default async function PeoplePage({ searchParams }: PageProps<"/people">) {
  const { deleted } = await searchParams;
  const { supabase, organiser } = await requireOrganiser();

  const { data, error } = await supabase
    .from("people")
    .select("id, first_name, last_name, suburb, email, phone, user_id, photo_updated_at, attendance(count)")
    .eq("team_id", organiser.team_id)
    .order("first_name")
    .returns<Row[]>();

  if (error) return <LoadError what="people" />;

  const photos = await signPhotos(supabase, data ?? []);
  const people: PersonRow[] = (data ?? []).map(({ attendance, user_id, photo_updated_at, ...p }) => ({
    ...p,
    connected: !!user_id,
    events: attendance[0]?.count ?? 0,
    photoUrl: photo_updated_at ? (photos[p.id] ?? null) : null,
  }));
  const connected = people.filter((p) => p.connected).length;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">People</h1>
      <p className="mt-1 text-sm text-stone-500">
        {people.length} {people.length === 1 ? "person" : "people"} in {organiser.team?.name ?? "your team"} ·{" "}
        {connected} with an account
      </p>
      {deleted && (
        <p className="mt-4 rounded-2xl bg-cyan/20 px-4 py-3 text-sm font-medium text-navy">Person deleted.</p>
      )}
      <PeopleList people={people} />
    </div>
  );
}
