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
  PRACTICE_COOKIE,
  type ViewRole,
} from "@/lib/organiser";
import { GIVES, type Access } from "@/lib/roles";
import { cleanFacebookUrl } from "@/lib/messenger";
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
  const lastName = String(formData.get("last_name") ?? "").trim();
  // Contact details: only saved for Regional Support Leads and God Mode.
  const phone = String(formData.get("phone") ?? "")
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const facebook = cleanFacebookUrl(String(formData.get("facebook") ?? ""));

  if (!firstName) return { error: "Please add a first name." };
  if (phone && phone.replace(/\D/g, "").length < 8)
    return { error: "That phone number looks too short." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "That email doesn't look right." };
  if (facebook === null)
    return { error: "Paste their Facebook profile link (facebook.com/…)." };

  const { data, error } = await supabase.rpc("add_person", {
    p_team_id: organiser.team_id,
    p_first: firstName,
    p_last: lastName,
    p_phone: phone,
    p_email: email,
    p_facebook: facebook,
  });

  if (error || !data)
    return { error: "Couldn't save this person. Please try again." };

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
  role:
    ViewRole | "new_organiser" | "new_organiser_new" | "new_core_team" | null,
): Promise<void> {
  const { supabase, organiser } = await getStaff();
  if (organiser?.access !== "god") return;
  const jar = await cookies();
  // Every change of view starts the Practice Community afresh.
  jar.delete(PRACTICE_COOKIE);
  await supabase.rpc("reset_practice_team");
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
  const { data: row } = await supabase
    .from("people")
    .select("email")
    .eq("id", personId)
    .maybeSingle();
  const { data, error } = await supabase.rpc("set_person_contact", {
    p_person_id: personId,
    p_phone: clean,
    p_email: row?.email ?? "",
  });
  if (error || data !== "ok")
    return { error: "Couldn't save the number. Please try again." };
  revalidatePath(`/people/${personId}`);
  return {};
}

// Give someone a role (Core Team, Organiser or Regional Support Lead).
export async function grantRole(
  personId: string,
  role: string,
  regionId: string | null,
  teamId: string | null = null,
): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireOrganiser();
  // Previewing: allowed when the previewed role could give this role too.
  if (organiser.viewingAs && !GIVES[organiser.role].includes(role as Access))
    return {
      error: `A ${organiser.role === "regional_lead" ? "Regional Support Lead" : "role you're previewing"} can't give that role.`,
    };
  const { data, error } = await supabase.rpc("grant_role_in", {
    p_person_id: personId,
    p_role: role,
    p_region_id: regionId,
    p_team_id: teamId,
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
  if (error) return { error: "Couldn't remove that action. Please try again." };
  revalidatePath("/tasks", "layout");
  return {};
}

// Which follow-up tasks are made after each event in this community.
export async function saveTeamTasks(
  kinds: string[],
): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireOrganiser();
  // Only the tutorial preview saves nothing; "View as" still saves for real.
  if (organiser.tourPreview) return {};
  const { data, error } = await supabase.rpc("set_team_tasks", {
    p_team_id: organiser.homeTeamId,
    p_kinds: kinds,
  });
  if (error || !data) return { error: "Couldn't save. Please try again." };
  revalidatePath("/tasks");
  return {};
}

export async function finishOrganiserTour(): Promise<void> {
  const { supabase, organiser } = await requireOrganiser();
  if (organiser.tourPreview) {
    // God Mode preview: the tour's done for this preview. "New community"
    // carries on in a fresh Practice Community; "existing" in the real one.
    await supabase.rpc("reset_practice_team");
    (await cookies()).set(PRACTICE_COOKIE, "1", {
      path: "/",
      maxAge: 60 * 60 * 12,
      sameSite: "lax",
    });
    revalidatePath("/", "layout");
    return;
  }
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
  if (error)
    return { error: "Couldn't remove those actions. Please try again." };
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
  if (!title.trim()) return { error: "Give the action a name." };
  const { data, error } = await supabase.rpc("add_custom_task", {
    p_team_id: organiser.homeTeamId,
    p_title: title.trim(),
    p_minutes: minutes,
    p_when: when,
    p_days: days,
  });
  if (error || !data)
    return { error: "Couldn't add the action. Please try again." };
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
    return { error: "Couldn't save your actions. Please try again." };
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

// ---- Regional Support Lead check-ins ----

// Tick off a check-in with how it went. "No reply yet" pauses that
// community's monthly check-ins until they reply (no repeated nudges).
export async function completeCheckIn(
  taskId: string,
  outcome: "replied" | "no_reply",
): Promise<{ error?: string }> {
  const { supabase } = await requireOrganiser();
  const { data, error } = await supabase.rpc("complete_check_in", {
    p_task_id: taskId,
    p_outcome: outcome,
  });
  if (error || data !== "ok")
    return { error: "Couldn't save that. Please try again." };
  revalidatePath("/tasks");
  return {};
}

// For a community we're waiting to hear back from: they replied (monthly
// check-ins resume) or try again now (a new check-in task).
export async function resolveCheckInWait(
  teamId: string,
  action: "replied" | "try_again",
): Promise<{ error?: string }> {
  const { supabase } = await requireOrganiser();
  const { data, error } = await supabase.rpc("resolve_check_in_wait", {
    p_team_id: teamId,
    p_action: action,
  });
  if (error || data !== "ok")
    return { error: "Couldn't save that. Please try again." };
  revalidatePath("/tasks");
  return {};
}

// Move a task: hidden until showFrom, then due at dueAt.
export async function moveTask(
  taskId: string,
  showFrom: string,
  dueAt: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("move_task", {
    p_task_id: taskId,
    p_show_from: showFrom,
    p_due_at: dueAt,
  });
  if (error || data !== "ok")
    return { error: "Couldn't move that action. Please try again." };
  revalidatePath("/tasks");
  revalidatePath("/me");
  revalidatePath("/attendance/tasks");
  return {};
}

// A person's phone and email, added by an organiser or Regional Support Lead
// (e.g. someone given a role before they've connected their account).
export async function setPersonContact(
  personId: string,
  phone: string,
  email: string,
): Promise<{ error?: string }> {
  const { supabase } = await requireOrganiser();
  // Numbers pasted from a contacts app can carry invisible formatting marks.
  const p = phone
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .trim();
  const e = email.trim().toLowerCase();
  if (p && p.replace(/\D/g, "").length < 8)
    return { error: "That phone number looks too short." };
  if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    return { error: "That email doesn't look right." };
  const { data, error } = await supabase.rpc("set_person_contact", {
    p_person_id: personId,
    p_phone: p,
    p_email: e,
  });
  if (error || data !== "ok")
    return {
      error:
        data === "no_role"
          ? "Contact details can only be added for people with a role."
          : "Couldn't save their details. Please try again.",
    };
  revalidatePath(`/people/${personId}`);
  revalidatePath("/people");
  return {};
}

// Someone's Facebook profile link (for the Messenger button). Same rule as
// phone and email: only for people with a role.
export async function setPersonFacebook(
  personId: string,
  url: string,
): Promise<{ error?: string }> {
  const { supabase } = await requireOrganiser();
  const clean = cleanFacebookUrl(url);
  if (clean === null)
    return { error: "Paste their Facebook profile link (facebook.com/…)." };
  const { data, error } = await supabase.rpc("set_person_facebook", {
    p_person_id: personId,
    p_url: clean,
  });
  if (error || data !== "ok")
    return {
      error:
        data === "no_role"
          ? "A Facebook link can only be added for people with a role."
          : "Couldn't save the Facebook link. Please try again.",
    };
  revalidatePath(`/people/${personId}`);
  return {};
}

// Bring an action that hasn't appeared yet forward: put it on the list now,
// or tick it off straight away ("already done").
export async function startActionEarly(
  eventId: string,
  kind: string,
  done: boolean | "skip", // "skip": not needed for this event
): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireOrganiser();
  if (organiser.tourPreview || organiser.exampleMode) return {}; // tutorial: example data stays as it is
  const [{ data: event }, { data: k }] = await Promise.all([
    supabase
      .from("events")
      .select("id, team_id, starts_at, ends_at")
      .eq("id", eventId)
      .maybeSingle(),
    supabase
      .from("task_kinds")
      .select("kind, anchor, due_after_hours")
      .eq("kind", kind)
      .maybeSingle(),
  ]);
  if (!event || !k) return { error: "Couldn't find that action." };
  const anchor = Date.parse(
    k.anchor === "end" ? (event.ends_at ?? event.starts_at) : event.starts_at,
  );
  const { error } = await supabase.from("tasks").insert({
    team_id: event.team_id,
    event_id: event.id,
    kind,
    due_at: new Date(anchor + Number(k.due_after_hours) * 36e5).toISOString(),
    ...(done === "skip"
      ? { dismissed_at: new Date().toISOString() }
      : done
        ? { done_at: new Date().toISOString(), done_by: organiser.id }
        : {}),
  });
  if (error)
    return {
      error:
        error.code === "23505"
          ? done === "skip"
            ? "It's already on your list. Remove it there with ×."
            : "It's already on your list."
          : "Couldn't do that. Please try again.",
    };
  revalidatePath("/tasks");
  return {};
}

// An event's own notes (organisers).
export async function saveEventNotes(
  eventId: string,
  notes: string,
): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireOrganiser();
  if (organiser.tourPreview || organiser.exampleMode) return {};
  const { error } = await supabase
    .from("events")
    .update({ notes: notes.trim() ? notes.slice(0, 5000) : null })
    .eq("id", eventId);
  if (error) return { error: "Couldn't save." };
  return {};
}

export async function finishCoreTour(): Promise<void> {
  const { supabase, organiser } = await requireCore();
  if (organiser.coreSetupPreview) return;
  await supabase.rpc("finish_core_tutorial");
  revalidatePath("/attendance", "layout");
}

// Personal invites: tick someone off as messaged for an event (or undo).
export async function markInvited(
  eventId: string,
  personId: string,
  kind: "invite" | "ask",
  sent: boolean,
): Promise<{ error?: string }> {
  const { supabase } = await requireCore();
  const { data: event } = await supabase
    .from("events")
    .select("team_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { error: "Couldn't find that event." };
  const { error } = sent
    ? await supabase.from("person_messages").upsert(
        {
          team_id: event.team_id,
          person_id: personId,
          event_id: eventId,
          kind,
        },
        { onConflict: "person_id,event_id", ignoreDuplicates: true },
      )
    : await supabase
        .from("person_messages")
        .delete()
        .eq("event_id", eventId)
        .eq("person_id", personId);
  if (error) return { error: "Couldn't save. Please try again." };
  revalidatePath(`/people/${personId}`);
  return {};
}

// Someone who'd rather not get personal messages: never listed again.
export async function setNoMessages(
  personId: string,
  value: boolean,
): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireCore();
  const { error } = await supabase
    .from("people")
    .update({ no_messages: value })
    .eq("id", personId)
    .eq("team_id", organiser.team_id);
  if (error) return { error: "Couldn't save. Please try again." };
  revalidatePath(`/people/${personId}`);
  return {};
}

// The event's Facebook event link, reused by every Facebook action.
export async function saveEventFacebookUrl(
  eventId: string,
  url: string,
): Promise<{ error?: string; url?: string | null }> {
  const { supabase, organiser } = await requireCore();
  if (organiser.tourPreview || organiser.exampleMode) return {};
  const raw = url.trim();
  let clean: string | null = null;
  if (raw) {
    try {
      const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
      if (!/(^|\.)(facebook\.com|fb\.me|fb\.com)$/.test(u.hostname))
        return { error: "That doesn't look like a Facebook link." };
      u.search = u.searchParams.get("event_time_id")
        ? `?event_time_id=${u.searchParams.get("event_time_id")}`
        : "";
      u.hash = "";
      clean = u.toString();
    } catch {
      return { error: "That doesn't look like a link." };
    }
  }
  const { data, error } = await supabase
    .from("events")
    .update({ facebook_url: clean })
    .eq("id", eventId)
    .select("id");
  if (error || !data?.length) return { error: "Couldn't save the link." };
  revalidatePath("/tasks");
  revalidatePath(`/events/${eventId}`);
  return { url: clean };
}

// The regulars list (for the set-up team pop-up).
export async function getRegularsList(eventId: string) {
  const { supabase, organiser } = await requireCore();
  const { loadRegularsList } = await import("@/lib/invites");
  return loadRegularsList(
    supabase,
    eventId,
    Date.now(),
    organiser.role !== "core_team", // organisers and up: anyone's details
  );
}

// This event's personal invite list (for the pop-up on the action).
export async function getInviteList(eventId: string) {
  const { supabase, organiser } = await requireCore();
  const { loadInviteList } = await import("@/lib/invites");
  return loadInviteList(
    supabase,
    eventId,
    Date.now(),
    organiser.role !== "core_team", // organisers and up: anyone's details
  );
}

// The community's newcomers (for New volunteers reminded).
export async function getNewcomersList(eventId: string) {
  const { supabase, organiser } = await requireCore();
  const { loadRegularsList } = await import("@/lib/invites");
  return loadRegularsList(
    supabase,
    eventId,
    Date.now(),
    organiser.role !== "core_team", // organisers and up: anyone's details
    true,
  );
}

// People not seen in a while (for Quiet volunteers re-engaged).
export async function getQuietList(teamId: string) {
  const { supabase, organiser } = await requireCore();
  const { loadQuietList } = await import("@/lib/invites");
  const invites = await loadQuietList(
    supabase,
    teamId,
    Date.now(),
    organiser.role !== "core_team", // organisers and up: anyone's details
  );
  return { invites, eventTitle: "" };
}

// Move someone to another community (God Mode and Regional Support Leads,
// who can see more than one). Their attendance history stays with them.
export async function movePersonToTeam(
  personId: string,
  teamId: string,
): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireOrganiser();
  if (organiser.role !== "god" && organiser.role !== "regional_lead")
    return { error: "Only Regional Support Leads can move people." };
  if (!organiser.teams.some((t) => t.id === teamId))
    return { error: "You can't move people to that community." };
  const { data, error } = await supabase
    .from("people")
    .update({ team_id: teamId })
    .eq("id", personId)
    .select("id");
  if (error || !data?.length)
    return { error: "Couldn't move them. Please try again." };
  revalidatePath("/people", "layout");
  return {};
}

// "Suggest a feature" on What's new.
export async function addSuggestion(
  body: string,
): Promise<{ error?: string; ok?: boolean }> {
  const { supabase, organiser } = await requireOrganiser();
  if (organiser.tourPreview || organiser.exampleMode) return { ok: true };
  const text = body.trim();
  if (text.length < 5) return { error: "Tell us a bit more." };
  if (text.length > 2000) return { error: "Keep it under 2,000 characters." };
  const { error } = await supabase.from("feature_suggestions").insert({
    body: text,
    author_name: organiser.name,
    team_id: organiser.homeTeamId,
  });
  if (error) return { error: "Couldn't send that. Please try again." };
  revalidatePath("/whats-new");
  return { ok: true };
}

export async function removeSuggestion(id: string) {
  const { supabase } = await requireOrganiser();
  await supabase.from("feature_suggestions").delete().eq("id", id);
  revalidatePath("/whats-new");
}

// "Volunteer feedback collected": the form link, the community chat, and responses.
export type FeedbackResponse = {
  id: string;
  rating: number | null;
  going_well: string | null;
  better: string | null;
  message: string | null; // open feedback from a volunteer's own page
  name: string | null;
  created_at: string;
};
export async function getFeedback(teamId: string): Promise<{
  token: string | null;
  whatsappUrl: string | null;
  responses: FeedbackResponse[];
}> {
  const { supabase } = await requireOrganiser();
  const [{ data: team }, { data: responses }] = await Promise.all([
    supabase
      .from("teams")
      .select("feedback_token, whatsapp_url")
      .eq("id", teamId)
      .maybeSingle(),
    supabase
      .from("volunteer_feedback")
      .select("id, rating, going_well, better, message, name, created_at")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  return {
    token: team?.feedback_token ?? null,
    whatsappUrl: team?.whatsapp_url ?? null,
    responses: (responses as FeedbackResponse[]) ?? [],
  };
}

// "Same person? Merge": people who might be the same as this one.
export type MergeCandidate = {
  id: string;
  name: string;
  team: string;
  events: number;
  connected: boolean;
  detail: string;
};
export async function findMergeCandidates(
  personId: string,
  query: string,
): Promise<MergeCandidate[]> {
  const { supabase, organiser } = await requireOrganiser();
  const q = query
    .trim()
    .replace(/[%_,()]/g, " ")
    .trim();
  const teamIds =
    organiser.role === "god" || organiser.role === "regional_lead"
      ? organiser.teams.map((t) => t.id)
      : [organiser.team_id];
  let req = supabase
    .from("people")
    .select(
      "id, first_name, last_name, email, phone, suburb, user_id, team:teams!people_team_id_fkey(name), attendance(count)",
    )
    .in("team_id", teamIds)
    .eq("is_test", false)
    .neq("id", personId)
    .order("first_name")
    .limit(25);
  if (q) {
    const [first, ...rest] = q.split(/\s+/);
    req = rest.length
      ? req
          .ilike("first_name", `${first}%`)
          .ilike("last_name", `${rest.join(" ")}%`)
      : req.or(`first_name.ilike.${first}%,last_name.ilike.${first}%`);
  }
  const { data } = await req.returns<
    {
      id: string;
      first_name: string;
      last_name: string | null;
      email: string | null;
      phone: string | null;
      suburb: string | null;
      user_id: string | null;
      team: { name: string } | null;
      attendance: { count: number }[];
    }[]
  >();
  return (data ?? []).map((p) => ({
    id: p.id,
    name: [p.first_name, p.last_name].filter(Boolean).join(" "),
    team: (p.team?.name ?? "").replace(/, (Australia|New Zealand)$/, ""),
    events: p.attendance[0]?.count ?? 0,
    connected: !!p.user_id,
    detail: [p.suburb, p.email, p.phone].filter(Boolean).join(" · "),
  }));
}

export async function mergePeople(
  keepId: string,
  dropId: string,
): Promise<{ error?: string }> {
  const { supabase, organiser } = await requireOrganiser();
  if (organiser.tourPreview || organiser.exampleMode) return {};
  if (organiser.role === "core_team")
    return { error: "Only organisers can merge people." };
  const { data, error } = await supabase.rpc("merge_people", {
    p_keep: keepId,
    p_drop: dropId,
  });
  if (error) return { error: "Couldn't merge them. Please try again." };
  if (data) return { error: data as string };
  revalidatePath("/people");
  return {};
}

export async function getAttendeesList(eventId: string) {
  const { supabase, organiser } = await requireCore();
  const { loadAttendeesList } = await import("@/lib/invites");
  const invites = await loadAttendeesList(
    supabase,
    eventId,
    Date.now(),
    organiser.role !== "core_team", // organisers and up: anyone's details
  );
  return { invites, eventTitle: "" };
}
