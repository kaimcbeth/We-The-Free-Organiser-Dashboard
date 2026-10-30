import { requireOrganiser } from "@/lib/organiser";
import { getFeedback } from "@/app/actions";
import { formatEventDate } from "@/lib/time";

const SCALE = ["Not great", "Meh", "OK", "Good", "Loving it"];

// Everything volunteers have sent this community: messages from their
// Feedback tab and answers to the quick feedback form. Opened from the bell.
export default async function FeedbackInboxPage() {
  const { organiser } = await requireOrganiser();
  const { responses } = await getFeedback(organiser.team_id);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feedback</h1>
        <p className="mt-1 text-sm text-stone-500">
          What volunteers in{" "}
          {organiser.team.name.replace(/, (Australia|New Zealand)$/, "")} have
          sent, newest first.
        </p>
      </div>
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
