import type { SupabaseClient } from "@supabase/supabase-js";
import { notSeenInAWhile } from "@/lib/drift";
import { messengerLink } from "@/lib/messenger";
import {
  engagementStatus,
  isLapsed,
  loadTracking,
  WINDOW_DAYS,
  type Status,
} from "@/lib/engagement";

// Who gets a personal message before an event, and when. All the numbers
// live here so they're easy to change.
export const INVITE_RULES = {
  newcomerGapDays: 7, // newcomers: before every event, at most weekly
  regularGapDays: 7, // regulars: before every event, at most weekly
  regularAskEvery: 3, // every 3rd message to a regular is an ask
  occasionalGapDays: 28, // occasionals: about once every 4 weeks
  driftSecondAfterDays: 42, // not seen in a while: a 2nd nudge 6 weeks later
  minGapDays: 14, // everyone else: never more than once a fortnight
};

const DAY = 864e5;

export type Message = {
  eventId: string | null;
  kind: "invite" | "ask";
  sentAt: string;
};

export type InviteReason =
  | "first_timer"
  | "newcomer"
  | "drift"
  | "drift_again"
  | "occasional"
  | "regular";

export type Invite = {
  personId: string;
  name: string;
  group: "priority" | "regulars";
  reason: InviteReason;
  detail: string; // e.g. "3 events so far"
  kind: "invite" | "ask";
  sent: boolean; // already messaged for this event
  whatsapp: string | null;
  facebook: string | null;
  phone: string | null; // raw, for editing
  facebookUrl: string | null;
  canEdit: boolean; // may add/edit their contact details (privacy rules)
};

type PersonIn = {
  id: string;
  name: string;
  attended: { at: string; eventId: string; typeId: string | null }[];
  attendedBefore: boolean;
  hasRole: boolean;
  messages: Message[]; // newest first
  phone: string | null;
  facebook: string | null;
};

const weeks = (days: number) =>
  days < 14 ? `${days} days` : `${Math.round(days / 7)} weeks`;

// Australian numbers to WhatsApp's international format (no message text).
export function whatsappLink(phone: string | null) {
  if (!phone) return null;
  let d = phone.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("0")) d = "61" + d.slice(1);
  return d.length >= 8 ? `https://wa.me/${d}` : null;
}

// The decision for one person. null = not this time.
export function inviteFor(
  p: PersonIn,
  event: { id: string; typeId: string | null },
  now: number,
  tracking: Parameters<typeof engagementStatus>[3],
): Omit<
  Invite,
  | "personId"
  | "name"
  | "whatsapp"
  | "facebook"
  | "phone"
  | "facebookUrl"
  | "canEdit"
> | null {
  const dates = p.attended.map((a) => a.at);
  const already = p.messages.find((m) => m.eventId === event.id);
  const earlier = p.messages.filter((m) => m.eventId !== event.id);
  const sinceLast = earlier.length
    ? Math.floor((now - Date.parse(earlier[0].sentAt)) / DAY)
    : Infinity;
  if (dates.length === 0 || isLapsed(dates, now)) return null;
  let status: Status | null = engagementStatus(
    dates,
    p.attendedBefore,
    now,
    tracking,
  );
  const drift = notSeenInAWhile(dates, now);
  const lastSeen = Math.max(...dates.map((d) => Date.parse(d)));
  const recent = dates.filter(
    (d) => now - Date.parse(d) <= WINDOW_DAYS * DAY,
  ).length;

  // A newcomer who skipped the last 2 events we messaged them about is
  // treated as occasional (no point messaging before every one).
  if (status === "newcomer") {
    const went = new Set(p.attended.map((a) => a.eventId));
    const lastTwo = earlier.filter((m) => m.eventId).slice(0, 2);
    if (lastTwo.length === 2 && lastTwo.every((m) => !went.has(m.eventId!)))
      status = "occasional";
  }

  const pick = (
    reason: InviteReason,
    detail: string,
    kind: "invite" | "ask" = "invite",
  ) => ({
    group: reason === "regular" ? ("regulars" as const) : ("priority" as const),
    reason,
    detail,
    kind: already?.kind ?? kind,
    sent: !!already,
  });
  const R = INVITE_RULES;

  if (status === "first_timer") {
    const after = earlier.some((m) => Date.parse(m.sentAt) > lastSeen);
    return already || !after ? pick("first_timer", "Came once so far") : null;
  }
  if (status === "newcomer")
    return already || sinceLast >= R.newcomerGapDays
      ? pick("newcomer", `${dates.length} events so far`)
      : null;
  if (drift) {
    const since = earlier.filter((m) => Date.parse(m.sentAt) > lastSeen);
    const ago = `Last came ${weeks(drift.sinceDays)} ago`;
    if (already) return pick(since.length ? "drift_again" : "drift", ago);
    if (since.length === 0 && sinceLast >= R.minGapDays)
      return pick("drift", ago);
    if (since.length === 1 && sinceLast >= R.driftSecondAfterDays)
      return pick("drift_again", ago);
    return null;
  }
  if (status === "regular") {
    if (p.hasRole && !already) return null; // already in the loop
    if (!already && sinceLast < R.regularGapDays) return null;
    // Every third message is an ask (help out / bring a friend).
    const lastInvites = earlier.slice(0, R.regularAskEvery - 1);
    const ask =
      lastInvites.length === R.regularAskEvery - 1 &&
      lastInvites.every((m) => m.kind === "invite");
    return pick(
      "regular",
      `${recent} events in 3 months`,
      ask ? "ask" : "invite",
    );
  }
  if (status === "occasional") {
    if (already)
      return pick(
        "occasional",
        `Last came ${weeks(Math.floor((now - lastSeen) / DAY))} ago`,
      );
    if (sinceLast < R.occasionalGapDays) return null;
    // Only for the kinds of event they come to.
    const types = new Set(p.attended.map((a) => a.typeId).filter(Boolean));
    if (event.typeId && types.size > 0 && !types.has(event.typeId)) return null;
    return pick(
      "occasional",
      `Last came ${weeks(Math.floor((now - lastSeen) / DAY))} ago`,
    );
  }
  return null;
}

const ORDER: InviteReason[] = [
  "first_timer",
  "newcomer",
  "drift",
  "drift_again",
  "occasional",
  "regular",
];

type Row = {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  facebook_url: string | null;
  attended_before_app: boolean;
  pending_role: string | null;
  attendance: {
    event: {
      id: string;
      starts_at: string;
      event_type_id: string | null;
    } | null;
  }[];
};

// The list for one event, in priority order.
export async function loadInviteList(
  supabase: SupabaseClient,
  eventId: string,
  now: number,
  // RSLs and God Mode may add anyone's details; otherwise only people with a role.
  canEditAny = false,
): Promise<{ invites: Invite[]; eventTitle: string } | null> {
  const { data: event } = await supabase
    .from("events")
    .select("id, team_id, title, event_type_id")
    .eq("id", eventId)
    .maybeSingle<{
      id: string;
      team_id: string;
      title: string;
      event_type_id: string | null;
    }>();
  if (!event) return null;
  const since = new Date(now - 400 * DAY).toISOString();
  const [
    { data: people },
    { data: msgs },
    { data: roles },
    { data: leads },
    tracking,
  ] = await Promise.all([
    supabase
      .from("people")
      .select(
        "id, first_name, last_name, phone, facebook_url, attended_before_app, pending_role, attendance(event:events(id, starts_at, event_type_id))",
      )
      .eq("team_id", event.team_id)
      .eq("is_test", false)
      .eq("no_messages", false)
      .returns<Row[]>(),
    supabase
      .from("person_messages")
      .select("person_id, event_id, kind, sent_at")
      .eq("team_id", event.team_id)
      .gte("sent_at", since)
      .order("sent_at", { ascending: false }),
    supabase.rpc("list_roles"),
    supabase
      .from("person_core_roles")
      .select("person_id")
      .eq("team_id", event.team_id)
      .is("ended_at", null),
    loadTracking(supabase, event.team_id, now),
  ]);
  const withRole = new Set<string>([
    ...((roles as { person_id: string | null }[] | null) ?? []).flatMap((r) =>
      r.person_id ? [r.person_id] : [],
    ),
    ...(leads ?? []).map((l) => l.person_id as string),
  ]);
  const byPerson = new Map<string, Message[]>();
  for (const m of (msgs ?? []) as {
    person_id: string;
    event_id: string | null;
    kind: "invite" | "ask";
    sent_at: string;
  }[])
    byPerson.set(m.person_id, [
      ...(byPerson.get(m.person_id) ?? []),
      { eventId: m.event_id, kind: m.kind, sentAt: m.sent_at },
    ]);

  const invites: Invite[] = [];
  for (const p of people ?? []) {
    const decision = inviteFor(
      {
        id: p.id,
        name: p.first_name,
        attended: p.attendance.flatMap((a) =>
          a.event && a.event.id !== event.id
            ? [
                {
                  at: a.event.starts_at,
                  eventId: a.event.id,
                  typeId: a.event.event_type_id,
                },
              ]
            : [],
        ),
        attendedBefore: p.attended_before_app,
        hasRole: withRole.has(p.id) || !!p.pending_role,
        messages: byPerson.get(p.id) ?? [],
        phone: p.phone,
        facebook: p.facebook_url,
      },
      { id: event.id, typeId: event.event_type_id },
      now,
      tracking,
    );
    if (decision)
      invites.push({
        personId: p.id,
        name: [p.first_name, p.last_name].filter(Boolean).join(" "),
        whatsapp: whatsappLink(p.phone),
        facebook: messengerLink(p.facebook_url),
        phone: p.phone,
        facebookUrl: p.facebook_url,
        canEdit: canEditAny || withRole.has(p.id) || !!p.pending_role,
        ...decision,
      });
  }
  invites.sort(
    (a, b) =>
      ORDER.indexOf(a.reason) - ORDER.indexOf(b.reason) ||
      a.name.localeCompare(b.name),
  );
  return { invites, eventTitle: event.title };
}
