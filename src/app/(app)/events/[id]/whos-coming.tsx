import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

type Row = {
  status: "going" | "maybe" | "no";
  person: { id: string; first_name: string; last_name: string | null } | null;
};

// Who's said they're coming (volunteers answer on their own page).
export async function WhosComing({
  supabase,
  eventId,
}: {
  supabase: SupabaseClient;
  eventId: string;
}) {
  const { data } = await supabase
    .from("event_rsvps")
    .select("status, person:people(id, first_name, last_name)")
    .eq("event_id", eventId)
    .returns<Row[]>();
  const rows = (data ?? []).filter((r) => r.person);
  const of = (s: Row["status"]) =>
    rows
      .filter((r) => r.status === s)
      .map((r) => r.person!)
      .sort((a, b) => a.first_name.localeCompare(b.first_name));
  const going = of("going");
  const maybe = of("maybe");
  if (!going.length && !maybe.length) return null;
  const names = (list: typeof going) =>
    list.map((p, i) => (
      <span key={p.id}>
        {i > 0 && ", "}
        <Link href={`/people/${p.id}`} className="hover:underline">
          {[p.first_name, p.last_name].filter(Boolean).join(" ")}
        </Link>
      </span>
    ));
  return (
    <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <h2 className="font-semibold text-navy">
        Who&apos;s coming{" "}
        <span className="font-normal text-stone-500">
          {going.length} going{maybe.length ? ` · ${maybe.length} maybe` : ""}
        </span>
      </h2>
      {going.length > 0 && (
        <p className="mt-1.5 text-sm text-stone-700">
          <span className="font-medium">Going:</span> {names(going)}
        </p>
      )}
      {maybe.length > 0 && (
        <p className="mt-1 text-sm text-stone-500">
          <span className="font-medium">Maybe:</span> {names(maybe)}
        </p>
      )}
    </section>
  );
}
