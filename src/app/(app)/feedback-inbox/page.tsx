import Link from "next/link";
import { requireOrganiser } from "@/lib/organiser";
import { getFeedback } from "@/app/actions";
import { formatEventDate } from "@/lib/time";

const SCALE = ["Not great", "Meh", "OK", "Good", "Loving it"];

// Everything volunteers have sent this community: messages from their
// Feedback tab and answers to the quick feedback form. Opened from the bell.
export default async function FeedbackInboxPage({
  searchParams,
}: PageProps<"/feedback-inbox">) {
  const { from } = await searchParams;
  const { supabase, organiser } = await requireOrganiser();
  // Regional Support Leads (and God): organisers' feedback for them too.
  const lead =
    organiser.access === "god" || organiser.access === "regional_lead";
  if (lead && from === "organisers") {
    const { data } = await supabase
      .from("organiser_feedback")
      .select("id, name, message, created_at, team:teams(name)")
      .order("created_at", { ascending: false })
      .limit(200);
    const rows = (data ?? []) as unknown as {
      id: string;
      name: string | null;
      message: string;
      created_at: string;
      team: { name: string } | null;
    }[];
    return (
      <div className="space-y-4">
        <Header lead from="organisers" />
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
            Nothing from organisers yet. They can send it any time from
            Resources.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
              >
                <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold text-navy">
                    {r.name ?? "Anonymous"}
                    {r.team && (
                      <span className="font-normal text-stone-500">
                        {" "}
                        ·{" "}
                        {r.team.name.replace(/, (Australia|New Zealand)$/, "")}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-stone-500">
                    {formatEventDate(r.created_at)}
                  </span>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">
                  {r.message}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  const { responses } = await getFeedback(organiser.team_id);
  return (
    <div className="space-y-4">
      <Header
        lead={lead}
        from="members"
        community={organiser.team.name.replace(
          /, (Australia|New Zealand)$/,
          "",
        )}
      />
      {responses.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
          Nothing yet. Volunteers can send feedback any time from their Feedback
          tab.
        </p>
      ) : (
        <ul className="space-y-3">
          {responses.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
            >
              <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold text-navy">
                  {r.name ?? "Anonymous"}
                </span>
                <span className="text-xs text-stone-500">
                  {formatEventDate(r.created_at)}
                  {r.rating ? ` · ${SCALE[r.rating - 1]}` : ""}
                </span>
              </p>
              {r.message && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">
                  {r.message}
                </p>
              )}
              {r.going_well && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">
                  <span className="font-medium">Going well: </span>
                  {r.going_well}
                </p>
              )}
              {r.better && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">
                  <span className="font-medium">Could be better: </span>
                  {r.better}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Header({
  lead,
  from,
  community,
}: {
  lead: boolean;
  from: "members" | "organisers";
  community?: string;
}) {
  const tab = (on: boolean) =>
    `rounded-full px-3 py-1 text-sm font-medium ${on ? "bg-navy text-white" : "bg-white text-stone-600 ring-1 ring-black/10"}`;
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Feedback</h1>
      <p className="mt-1 text-sm text-stone-500">
        {from === "members"
          ? `What volunteers in ${community} have sent, newest first.`
          : "What organisers in your region have sent you, newest first."}
      </p>
      {lead && (
        <div className="mt-3 flex gap-2">
          <Link href="/feedback-inbox" className={tab(from === "members")}>
            From members
          </Link>
          <Link
            href="/feedback-inbox?from=organisers"
            className={tab(from === "organisers")}
          >
            From organisers
          </Link>
        </div>
      )}
    </div>
  );
}
