"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import {
  getStaff,
  requireCore,
  requireOrganiser,
  TEAM_COOKIE,
  ALL_COOKIE,
  VIEW_AS_COOKIE,
  type ViewRole,
} from "@/lib/organiser";
import { GIVES, type Access } from "@/lib/roles";
import { dayBoundsUtc, todayInTz, zonedToUtcIso } from "@/lib/time";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type FormState = { error?: string };

// Add an event by hand (the automatic import from activism.wtf comes in Phase 2).
export async function createEvent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, organiser } = await requireOrganiser();

  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const start = String(formData.get("start") ?? "");
  const end = String(formData.get("end") ?? "");
  const eventTypeId = String(formData.get("event_type_id") ?? "") || null;
  const venue = String(formData.get("venue") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;

  if (!title || !date || !start)
    return { error: "Please add a title, date and start time." };

  const startsAt = zonedToUtcIso(date, start);
  const endsAt = end ? zonedToUtcIso(date, end) : null;
  if (endsAt && endsAt <= startsAt)
    return { error: "The end time needs to be after the start time." };

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

// Add a person from the People page. Organisers only enter a name;
// members add their own details when they connect their account.
export async function createPerson(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, organiser } = await requireOrganiser();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim() || null;

  if (!firstName) return { error: "Please add a first name." };

  const { error } = await supabase.from("people").insert({
    team_id: organiser.team_id,
    first_name: firstName,
    last_name: lastName,
    added_via: "host",
  });

  if (error) return { error: "Couldn't save this person. Please try again." };

  revalidatePath("/people");
  return {};
}

export type InviteResult = { token?: string; error?: string };

// Make (or reuse) a personal connect link for someone who hasn't got a login yet.
export async function createInvite(personId: string): Promise<InviteResult> {
  const { supabase, organiser } = await requireOrganiser();

  const { data: person } = await supabase
    .from("people")
    .select("id, user_id")
    .eq("id", personId)
    .eq("team_id", organiser.team_id)
    .maybeSingle();
  if (!person) return { error: "Couldn't find that person." };
  if (person.user_id) return { error: "This person is already connected." };

  const { data: existing } = await supabase
    .from("person_invites")
    .select("token")
    .eq("person_id", personId)
    .is("used_at", null)
    .gt("expires_at", new Date(Date.now() + 864e5).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return { token: existing.token };

  const { data, error } = await supabase
    .from("person_invites")
    .insert({ person_id: personId, created_by: organiser.id })
    .select("token")
    .single();
  if (error || !data)
    return { error: "Couldn't create an invite. Please try again." };
  return { token: data.token };
}

// Remove a person and everything linked to them (check-ins, invites, photo).
// Their login (if they had one) stays, but is no longer connected to anything.
export async function deletePerson(
  personId: string,
): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireOrganiser();

  const { data: person } = await supabase
    .from("people")
    .select("id, photo_updated_at")
    .eq("id", personId)
    .eq("team_id", organiser.team_id)
    .maybeSingle();
  if (!person) return { error: "Couldn't find that person." };

  if (person.photo_updated_at) {
    await supabase.storage.from("avatars").remove([`${personId}.jpg`]);
  }

  const { error } = await supabase
    .from("people")
    .delete()
    .eq("id", personId)
    .eq("team_id", organiser.team_id);
  if (error) return { error: "Couldn't delete this person. Please try again." };

  revalidatePath("/people");
  revalidatePath("/");
  redirect("/people?deleted=1");
}

// Change an event's type (imports never overwrite this once set).
export async function setEventType(
  eventId: string,
  eventTypeId: string | null,
): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireOrganiser();
  const { error } = await supabase
    .from("events")
    .update({
      event_type_id: eventTypeId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .eq("team_id", organiser.team_id);
  if (error) return { error: "Couldn't change the type." };
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/");
  return {};
}

export type HelperLink = { token: string; expires_at: string };

// Make (or reuse) a no-login check-in link for one event, for a helper at the door.
// It stops working 6 hours after the event ends.
export async function createHelperLink(
  eventId: string,
): Promise<{ link?: HelperLink; error?: string }> {
  const { supabase, organiser } = await requireOrganiser();

  const { data: event } = await supabase
    .from("events")
    .select("id, starts_at, ends_at")
    .eq("id", eventId)
    .eq("team_id", organiser.team_id)
    .maybeSingle();
  if (!event) return { error: "Couldn't find that event." };

  const { data: existing } = await supabase
    .from("checkin_links")
    .select("token, expires_at")
    .eq("event_id", eventId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return { link: existing };

  const end = event.ends_at
    ? Date.parse(event.ends_at)
    : Date.parse(event.starts_at) + 4 * 3600e3;
  const expires = new Date(
    Math.max(end + 6 * 3600e3, Date.now() + 2 * 3600e3),
  ).toISOString();

  const { data, error } = await supabase
    .from("checkin_links")
    .insert({
      event_id: eventId,
      created_by: organiser.id,
      expires_at: expires,
    })
    .select("token, expires_at")
    .single();
  if (error || !data)
    return { error: "Couldn't create a link. Please try again." };
  return { link: data };
}

// Turn off every helper link for an event.
export async function revokeHelperLinks(
  eventId: string,
): Promise<{ error?: string }> {
  const { supabase } = await requireOrganiser();
  const { error } = await supabase
    .from("checkin_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .is("revoked_at", null);
  if (error) return { error: "Couldn't turn off the link. Please try again." };
  revalidatePath(`/events/${eventId}`);
  return {};
}

// "Came to events before the app": never shown or counted as a first-timer.
export async function setAttendedBefore(
  personId: string,
  value: boolean,
): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireOrganiser();
  const { error } = await supabase
    .from("people")
    .update({ attended_before_app: value })
    .eq("id", personId)
    .eq("team_id", organiser.team_id);
  if (error) return { error: "Couldn't save. Please try again." };
  revalidatePath(`/people/${personId}`);
  revalidatePath("/insights");
  return {};
}

// Approve (or remove) someone as a buddy. Only people with a connected account
// can be buddies, because the reminders go to their login.
export async function setIsBuddy(
  personId: string,
  value: boolean,
): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireOrganiser();
  const { data: person } = await supabase
    .from("people")
    .select("id, user_id")
    .eq("id", personId)
    .eq("team_id", organiser.team_id)
    .maybeSingle();
  if (!person) return { error: "Couldn't find that person." };
  if (value && !person.user_id)
    return { error: "They need to connect their account first." };

  const { error } = await supabase
    .from("people")
    .update({ is_buddy: value })
    .eq("id", personId);
  if (error) return { error: "Couldn't save. Please try again." };

  // No longer a buddy: end the pairings they had.
  if (!value) {
    await supabase
      .from("buddy_pairings")
      .update({ ended_at: new Date().toISOString() })
      .eq("buddy_id", personId)
      .is("ended_at", null);
  }
  revalidatePath(`/people/${personId}`);
  return {};
}

// Give a newcomer a buddy (or change / remove it). buddyId null = no buddy.
export async function assignBuddy(
  newcomerId: string,
  buddyId: string | null,
): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireOrganiser();

  if (buddyId) {
    const { data: buddy } = await supabase
      .from("people")
      .select("id, is_buddy")
      .eq("id", buddyId)
      .eq("team_id", organiser.team_id)
      .maybeSingle();
    if (!buddy?.is_buddy)
      return { error: "That person isn't on New member support." };
    if (buddyId === newcomerId)
      return { error: "Someone can't support themselves." };
  }

  const { data: current } = await supabase
    .from("buddy_pairings")
    .select("id, buddy_id")
    .eq("newcomer_id", newcomerId)
    .is("ended_at", null)
    .maybeSingle();
  if (current?.buddy_id === buddyId) return {};

  if (current) {
    const { error } = await supabase
      .from("buddy_pairings")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", current.id);
    if (error)
      return {
        error: "Couldn't change their support person. Please try again.",
      };
  }

  if (buddyId) {
    const { error } = await supabase.from("buddy_pairings").insert({
      team_id: organiser.team_id,
      newcomer_id: newcomerId,
      buddy_id: buddyId,
      via: "organiser",
      created_by: organiser.id,
    });
    if (error)
      return { error: "Couldn't save their support person. Please try again." };
  }

  revalidatePath(`/people/${newcomerId}`);
  if (buddyId) revalidatePath(`/people/${buddyId}`);
  return {};
}

export type TeamLink = { token: string; expires_at: string };

// One attendance link for the whole team: always opens whatever event is on
// today, so helpers never pick an event. "today" ends at midnight tonight.
export async function createTeamLink(
  length: "today" | "month" | "3months",
): Promise<{ link?: TeamLink; error?: string }> {
  const { supabase, organiser } = await requireOrganiser();
  const expires =
    length === "today"
      ? dayBoundsUtc(todayInTz()).end
      : new Date(
          Date.now() + (length === "month" ? 31 : 92) * 864e5,
        ).toISOString();

  // Replace any team link that's still on, so there's only ever one.
  await supabase
    .from("checkin_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("team_id", organiser.team_id)
    .is("revoked_at", null);

  const { data, error } = await supabase
    .from("checkin_links")
    .insert({
      team_id: organiser.team_id,
      created_by: organiser.id,
      expires_at: expires,
    })
    .select("token, expires_at")
    .single();
  if (error || !data)
    return { error: "Couldn't create a link. Please try again." };
  revalidatePath("/");
  return { link: data };
}

export async function revokeTeamLinks(): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireOrganiser();
  const { error } = await supabase
    .from("checkin_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("team_id", organiser.team_id)
    .is("revoked_at", null);
  if (error) return { error: "Couldn't turn off the link. Please try again." };
  revalidatePath("/");
  return {};
}

// Change (or clear) the team's WhatsApp community link.
export async function setTeamWhatsapp(
  url: string,
): Promise<{ error?: string; url?: string | null }> {
  const { supabase } = await requireOrganiser();
  const { data, error } = await supabase.rpc("set_team_whatsapp", {
    p_url: url,
  });
  if (error) return { error: "Couldn't save. Please try again." };
  if (data === "invalid")
    return {
      error:
        "That doesn't look like a WhatsApp invite link (https://chat.whatsapp.com/…).",
    };
  if (data !== "ok") return { error: "Only organisers can change this." };
  revalidatePath("/", "layout");
  const m = url.trim().match(/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/);
  return { url: m ? m[0] : null };
}

// Switch which team a God Mode / Regional Support Lead is looking at.
export async function setActiveTeam(teamId: string): Promise<void> {
  const { organiser } = await getStaff();
  if (!organiser) return;
  const jar = await cookies();
  const opts = {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
  };
  if (teamId === "all") {
    jar.set(ALL_COOKIE, "1", opts);
  } else {
    if (!organiser.teams.some((t) => t.id === teamId)) return;
    jar.set(TEAM_COOKIE, teamId, opts);
    jar.delete(ALL_COOKIE);
  }
  revalidatePath("/", "layout");
}

// God Mode: preview the app as another role (null = back to God Mode).
export async function setViewAs(
  role: ViewRole | "new_organiser" | "new_core_team" | null,
): Promise<void> {
  const { organiser } = await getStaff();
  if (organiser?.access !== "god") return;
  const jar = await cookies();
  if (!role || role === "god") jar.delete(VIEW_AS_COOKIE);
  else
    jar.set(VIEW_AS_COOKIE, role, {
      path: "/",
      maxAge: 60 * 60 * 12,
      sameSite: "lax",
    });
  revalidatePath("/", "layout");
  redirect(
    role === "member" || role === "new_member"
      ? "/me"
      : role === "core_team"
        ? "/attendance"
        : role === "new_core_team"
          ? "/attendance/tasks"
          : "/",
  );
}

const GRANT_ERRORS: Record<string, string> = {
  self: "You can't change your own role.",
  need_region: "Pick a region.",
  not_allowed: "You can't give that role to this person.",
  not_found: "Couldn't find that person.",
  bad_role: "Unknown role.",
};

// Take back a role that's waiting for someone to connect their account.
export async function clearPendingRole(
  personId: string,
): Promise<{ error?: string }> {
  const { supabase } = await requireOrganiser();
  const { data, error } = await supabase.rpc("clear_pending_role", {
    p_person_id: personId,
  });
  if (error || data !== "ok")
    return { error: "Couldn't change that. Please try again." };
  revalidatePath("/people", "layout");
  return {};
}

// A person's WhatsApp number, added by an organiser (e.g. for someone given a
// role before they've connected, so their Regional Support Lead can reach them).
export async function setPersonPhone(
  personId: string,
  phone: string,
): Promise<{ error?: string }> {
  const { supabase } = await requireOrganiser();
  const clean = phone.trim();
  if (clean && clean.replace(/\D/g, "").length < 8)
    return { error: "That number looks too short." };
  const { data, error } = await supabase
    .from("people")
    .update({ phone: clean || null })
    .eq("id", personId)
    .select("id");
  if (error || !data?.length)
    return { error: "Couldn't save the number. Please try again." };
  revalidatePath(`/people/${personId}`);
  return {};
}

// Give someone a role (Core Team, Organiser or Regional Support Lead).
export async function grantRole(
  personId: string,
  role: string,
  regionId: string | null,
): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireOrganiser();
  // Previewing: allowed when the previewed role could give this role too.
  if (organiser.viewingAs && !GIVES[organiser.role].includes(role as Access))
    return {
      error: `A ${organiser.role === "regional_lead" ? "Regional Support Lead" : "role you're previewing"} can't give that role.`,
    };
  const { data, error } = await supabase.rpc("grant_role", {
    p_person_id: personId,
    p_role: role,
    p_region_id: regionId,
  });
  if (error) return { error: "Couldn't save. Please try again." };
  if (data !== "ok")
    return {
      error: GRANT_ERRORS[data as string] ?? "Couldn't save. Please try again.",
    };
  revalidatePath("/roles");
  revalidatePath("/people", "layout");
  return {};
}

// Tasks: assign to someone on the team (null = anyone), and tick off.
export async function assignTask(
  taskId: string,
  personId: string | null,
): Promise<{ error?: string }> {
  const { supabase } = await requireOrganiser();
  const { data, error } = await supabase.rpc("assign_task", {
    p_task_id: taskId,
    p_person_id: personId,
  });
  if (error || data !== "ok")
    return { error: "Couldn't assign that. Please try again." };
  revalidatePath("/tasks");
  return {};
}

export async function setTaskDone(
  taskId: string,
  done: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_my_task", {
    p_task_id: taskId,
    p_done: done,
  });
  if (error || !data) return { error: "Couldn't save. Please try again." };
  revalidatePath("/tasks");
  revalidatePath("/me");
  revalidatePath("/attendance/tasks");
  return {};
}

// Remove a task (the × on a task card). Organisers only.
export async function dismissTask(taskId: string): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireOrganiser();
  const { error } = await supabase
    .from("tasks")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", taskId)
    // Any of their communities (Regional Support Leads work across several).
    .in(
      "team_id",
      organiser.teams.map((t) => t.id),
    );
  if (error) return { error: "Couldn't remove that task. Please try again." };
  revalidatePath("/tasks", "layout");
  return {};
}

// Which follow-up tasks are made after each event in this community.
export async function saveTeamTasks(
  kinds: string[],
): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireOrganiser();
  if (organiser.viewingAs) return {}; // God Mode preview: don't change anything
  const { data, error } = await supabase.rpc("set_team_tasks", {
    p_team_id: organiser.team_id,
    p_kinds: kinds,
  });
  if (error || !data) return { error: "Couldn't save. Please try again." };
  revalidatePath("/tasks");
  return {};
}

export async function finishOrganiserTour(): Promise<void> {
  const { supabase, organiser } = await requireOrganiser();
  if (organiser.tourPreview) return;
  await supabase.rpc("finish_organiser_tutorial");
  revalidatePath("/", "layout");
}

// "Every time": future tasks of this kind go straight to this person (null = stop).
export async function setStandingDelegate(
  kind: string,
  eventTypeId: string | null,
  personId: string | null,
): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireOrganiser();
  const { data, error } = await supabase.rpc("set_task_delegate", {
    p_team_id: organiser.team_id,
    p_kind: kind,
    p_event_type_id: eventTypeId,
    p_person_id: personId,
  });
  if (error || data !== "ok")
    return { error: "Couldn't save. Please try again." };
  revalidatePath("/tasks");
  return {};
}

// Remove every open task for one event (e.g. it was cancelled).
export async function dismissEventTasks(
  eventId: string,
): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireOrganiser();
  const { error } = await supabase
    .from("tasks")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("team_id", organiser.team_id)
    .is("done_at", null)
    .is("dismissed_at", null);
  if (error) return { error: "Couldn't remove those tasks. Please try again." };
  revalidatePath("/tasks", "layout");
  return {};
}

// God Mode: change the hidden test person's role.
export async function setTestRole(
  personId: string,
  role: "member" | "core_team" | "organiser" | "regional_lead",
): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireOrganiser();
  if (organiser.access !== "god") return { error: "God Mode only." };
  const { data, error } = await supabase.rpc("set_test_role", {
    p_person_id: personId,
    p_role: role,
  });
  if (error || data !== "ok")
    return { error: "Couldn't change the role. Please try again." };
  revalidatePath("/test-accounts");
  return {};
}

// Organisers' own tasks, made for every event in their community.
export async function addCustomTask(
  title: string,
  minutes: number,
  when: "before" | "after",
  days: number,
): Promise<{ kind?: string; error?: string }> {
  const { supabase, organiser } = await requireOrganiser();
  if (!title.trim()) return { error: "Give the task a name." };
  const { data, error } = await supabase.rpc("add_custom_task", {
    p_team_id: organiser.team_id,
    p_title: title.trim(),
    p_minutes: minutes,
    p_when: when,
    p_days: days,
  });
  if (error || !data)
    return { error: "Couldn't add the task. Please try again." };
  revalidatePath("/tasks");
  return { kind: data as string };
}

export async function removeCustomTask(
  kind: string,
): Promise<{ error?: string }> {
  const { supabase } = await requireOrganiser();
  const { data, error } = await supabase.rpc("remove_custom_task", {
    p_kind: kind,
  });
  if (error || !data) return { error: "Couldn't remove it. Please try again." };
  revalidatePath("/tasks");
  return {};
}

// ---- Core Team ----

// Organisers: which lead roles a Core Team member has.
export async function setCoreRoles(
  personId: string,
  roles: string[],
): Promise<{ error?: string }> {
  const { supabase } = await requireOrganiser();
  const { data, error } = await supabase.rpc("set_core_roles", {
    p_person_id: personId,
    p_roles: roles,
  });
  if (error || data !== "ok")
    return { error: "Couldn't save their lead roles. Please try again." };
  revalidatePath("/people", "layout");
  return {};
}

// A Core Team member picks the tasks they'll look after.
export async function chooseCoreTasks(
  kinds: string[],
): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireCore();
  if (organiser.viewingAs) return {};
  const { data, error } = await supabase.rpc("choose_core_tasks", {
    p_kinds: kinds,
  });
  if (error || data !== "ok")
    return { error: "Couldn't save your tasks. Please try again." };
  revalidatePath("/attendance", "layout");
  return {};
}

// Hand one of your tasks to a helper (null = do it yourself).
export async function setTaskHelper(
  kind: string,
  helperId: string | null,
): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireCore();
  if (organiser.viewingAs) return {};
  const { data, error } = await supabase.rpc("set_task_helper", {
    p_team_id: organiser.team_id,
    p_kind: kind,
    p_helper_id: helperId,
  });
  if (error || data !== "ok")
    return { error: "Couldn't save that. Please try again." };
  revalidatePath("/attendance", "layout");
  return {};
}

// "I'm away until…" (null = I'm back).
export async function setAwayUntil(
  until: string | null,
): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireCore();
  if (organiser.viewingAs) return {};
  const { error } = await supabase.rpc("set_away_until", {
    p_until: until,
  });
  if (error) return { error: "Couldn't save that. Please try again." };
  revalidatePath("/attendance", "layout");
  return {};
}
