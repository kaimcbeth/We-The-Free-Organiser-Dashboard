"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOrganiser } from "@/lib/organiser";
import { zonedToUtcIso } from "@/lib/time";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type FormState = { error?: string };

// Add an event by hand (the automatic import from activism.wtf comes in Phase 2).
export async function createEvent(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, organiser } = await requireOrganiser();

  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const start = String(formData.get("start") ?? "");
  const end = String(formData.get("end") ?? "");
  const eventTypeId = String(formData.get("event_type_id") ?? "") || null;
  const venue = String(formData.get("venue") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;

  if (!title || !date || !start) return { error: "Please add a title, date and start time." };

  const startsAt = zonedToUtcIso(date, start);
  const endsAt = end ? zonedToUtcIso(date, end) : null;
  if (endsAt && endsAt <= startsAt) return { error: "The end time needs to be after the start time." };

  const { data, error } = await supabase
    .from("events")
    .insert({
      team_id: organiser.team_id,
      title,
      starts_at: startsAt,
      ends_at: endsAt,
      event_type_id: eventTypeId,
      venue,
      address,
      source: "manual",
    })
    .select("id")
    .single();

  if (error) return { error: "Couldn't save the event. Please try again." };

  revalidatePath("/");
  redirect(`/events/${data.id}`);
}

// Add a person from the People page.
export async function createPerson(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, organiser } = await requireOrganiser();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim() || null;
  const suburb = String(formData.get("suburb") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (!firstName) return { error: "Please add a first name." };

  const { error } = await supabase.from("people").insert({
    team_id: organiser.team_id,
    first_name: firstName,
    last_name: lastName,
    suburb,
    email,
    phone,
    added_via: "host",
  });

  if (error) {
    if (error.code === "23505") return { error: "Someone with that email is already in the list." };
    return { error: "Couldn't save this person. Please try again." };
  }

  revalidatePath("/people");
  return {};
}
