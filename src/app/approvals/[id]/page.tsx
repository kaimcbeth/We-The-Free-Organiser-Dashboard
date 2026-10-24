import Link from "next/link";
import { requireCore } from "@/lib/organiser";
import { CORE_ROLE_LABEL, ROLE_LABEL, type CoreRole } from "@/lib/roles";
import { formatEventDate, formatTimeRange } from "@/lib/time";
import { ordinal, shortTime } from "@/lib/approval-forms";
import { ApprovalForm } from "./approval-form";

// Default wording for outreach events (organisers can change it each time).
const PURPOSE = "to raise awareness regarding animal cruelty in Australia.";
const SPECIAL = "Temporary tables for resources.";

// Fill in and send the police/council notice for one event.
export default async function ApprovalPage({
  params,
}: PageProps<"/approvals/[id]">) {
  const { id } = await params;
  const { supabase, user, organiser } = await requireCore();
  // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
  const now = Date.now();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, title, starts_at, ends_at, venue, address, team_id, event_type_id, team:teams(name, timezone)",
    )
    .eq("id", id)
    .maybeSingle<{
      id: string;
      title: string;
      starts_at: string;
      ends_at: string | null;
      venue: string | null;
      address: string | null;
      team_id: string;
      event_type_id: string | null;
      team: { name: string; timezone: string } | null;
    }>();
  const back = (
    <Link href="/tasks" className="text-sm text-stone-500 hover:text-stone-800">
      ← Actions
    </Link>
  );
  if (!event)
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        {back}
        <h1 className="mt-3 text-2xl font-semibold">
          Can&apos;t open this event
        </h1>
      </main>
    );

  const tz = event.team?.timezone ?? "Australia/Sydney";
  const community = (event.team?.name ?? "").replace(
    /, (Australia|New Zealand)$/,
    "",
  );
  const since = new Date(now - 120 * 864e5).toISOString();
  const [
    { data: authority },
    { data: mine },
    { data: me },
    { data: leads },
    { data: past },
    { data: sent },
  ] = await Promise.all([
    supabase
      .from("approval_authorities")
      .select("name, greeting, email, form, notice_days")
      .eq("team_id", event.team_id)
      .maybeSingle(),
    supabase
      .from("person_private")
      .select("legal_name, address, postcode, phone, signature_path")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("people")
      .select("id, first_name, last_name, phone")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("person_core_roles")
      .select("core_role, person:people!inner(user_id)")
      .eq("person.user_id", user.id)
      .is("ended_at", null),
    // How many usually come to this kind of event (for "approximately N").
    supabase
      .from("events")
      .select("id, attendance(count)")
      .eq("team_id", event.team_id)
      .eq("event_type_id", event.event_type_id ?? "")
      .gte("starts_at", since)
      .lt("starts_at", new Date(now).toISOString()),
    supabase
      .from("approval_submissions")
      .select("sent_at, sent_to, test")
      .eq("event_id", event.id)
      .order("sent_at", { ascending: false }),
  ]);

  const counts = (past ?? [])
    .map((e) => (e.attendance as unknown as { count: number }[])[0]?.count ?? 0)
    .filter((n) => n > 0);
  const usual = counts.length ? Math.max(...counts) : 0;
  const number = String(Math.max(10, Math.ceil((usual + 2) / 5) * 5));

  const leadRole = ((leads ?? []) as { core_role: CoreRole }[])[0]?.core_role;
  const title =
    organiser.access === "core_team" && leadRole
      ? CORE_ROLE_LABEL[leadRole]
      : organiser.access === "god"
        ? "Organiser"
        : ROLE_LABEL[organiser.access];
  let signatureUrl: string | null = null;
  if (mine?.signature_path) {
    const { data } = await supabase.storage
      .from("signatures")
      .createSignedUrl(mine.signature_path, 3600);
    signatureUrl = data?.signedUrl ?? null;
  }

  const day = new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    day: "numeric",
  }).format(new Date(event.starts_at));
  const monthYear = new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    month: "long",
    year: "numeric",
  }).format(new Date(event.starts_at));
  const weekday = new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    weekday: "long",
  }).format(new Date(event.starts_at));
  const short = new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    day: "numeric",
    month: "numeric",
    year: "2-digit",
  })
    .format(new Date(event.starts_at))
    .replace(/\//g, "_");
  const daysAway = Math.floor((Date.parse(event.starts_at) - now) / 864e5);
  const place = event.venue || event.address || "";
  const fullName =
    mine?.legal_name ||
    [me?.first_name, me?.last_name].filter(Boolean).join(" ");

  return (
    <main className="mx-auto w-full max-w-lg px-4 pb-16 pt-6">
      {back}
      <p className="mt-3 text-sm text-stone-500">
        {formatEventDate(event.starts_at, tz)} ·{" "}
        {formatTimeRange(event.starts_at, event.ends_at, tz)}
        {place ? ` · ${place}` : ""}
      </p>
      <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
        Police approval: {event.title}
      </h1>
      {!authority ? (
        <p className="mt-4 rounded-2xl bg-white p-4 text-sm text-stone-600 shadow-sm ring-1 ring-black/5">
          There&apos;s no police or council contact set up for {community} yet.
          Ask your Regional Support Lead to add one.
        </p>
      ) : (
        <ApprovalForm
          eventId={event.id}
          userId={user.id}
          form={authority.form}
          authority={{
            name: authority.name,
            greeting: authority.greeting,
            email: authority.email,
          }}
          noticeDays={authority.notice_days}
          daysAway={daysAway}
          sent={(sent ?? []).map((s) => ({
            at: s.sent_at,
            to: s.sent_to,
            test: s.test,
          }))}
          initial={{
            name: fullName,
            address: mine?.address ?? "",
            postcode: mine?.postcode ?? "",
            phone: mine?.phone ?? me?.phone ?? "",
            organisation: `We The Free ${community}`,
            day: ordinal(Number(day)),
            monthYear,
            number,
            place,
            start: shortTime(event.starts_at, tz),
            end: event.ends_at ? shortTime(event.ends_at, tz) : "",
            purpose: PURPOSE,
            special: SPECIAL,
            capacity: `${title}, We The Free ${community}`,
          }}
          hasSaved={!!mine?.legal_name && !!mine?.address}
          signatureUrl={signatureUrl}
          dateLine={`${weekday} ${ordinal(Number(day))} ${monthYear}`}
          filename={`NOA ${short} - We The Free ${community}.pdf`}
          community={community}
        />
      )}
    </main>
  );
}
