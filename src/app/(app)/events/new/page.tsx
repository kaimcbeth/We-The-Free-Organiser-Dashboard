import Link from "next/link";
import { requireOrganiser } from "@/lib/organiser";
import { todayInTz } from "@/lib/time";
import { NewEventForm } from "./new-event-form";

export default async function NewEventPage() {
  const { supabase } = await requireOrganiser();
  const { data: types } = await supabase
    .from("event_types")
    .select("id, name")
    .order("sort_order");

  return (
    <div>
      <Link href="/" className="text-sm text-stone-500 hover:text-stone-800">
        ← Events
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Add event</h1>
      <p className="mt-1 text-sm text-stone-500">
        For events that aren&apos;t on activism.wtf, like a spontaneous social.
      </p>
      <NewEventForm types={types ?? []} today={todayInTz()} />
    </div>
  );
}
