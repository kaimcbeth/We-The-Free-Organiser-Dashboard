import { requireOrganiser } from "@/lib/organiser";
import {
  BUILD,
  changelogFor,
  COMING_SOON,
  STAGE,
  STAGE_TAG_LIGHT,
  VERSION,
  type ChangeLevel,
} from "@/lib/changelog";
import { MarkSeen } from "./mark-seen";
import { Suggest, type Suggestion } from "./suggest";

const BADGE: Record<ChangeLevel, { label: string; tone: string } | null> = {
  organiser: null,
  regional_lead: { label: "Regional", tone: "bg-pink/20 text-pink-ink" },
  god: { label: "God Mode", tone: "bg-navy text-yellow" },
};

export default async function WhatsNewPage() {
  const { supabase, organiser } = await requireOrganiser();
  const level: ChangeLevel =
    organiser.role === "god"
      ? "god"
      : organiser.role === "regional_lead"
        ? "regional_lead"
        : "organiser";
  const releases = changelogFor(level);
  const everyone = organiser.access === "god";
  const { data: rows } = await supabase
    .from("feature_suggestions")
    .select("id, body, created_at, author_name, user_id, team:teams(name)")
    .order("created_at", { ascending: false })
    .limit(everyone ? 200 : 20)
    .returns<
      {
        id: string;
        body: string;
        created_at: string;
        author_name: string | null;
        user_id: string;
        team: { name: string } | null;
      }[]
    >();
  const suggestions: Suggestion[] = (rows ?? []).map((r) => ({
    id: r.id,
    body: r.body,
    created_at: r.created_at,
    author_name: r.author_name,
    team: r.team?.name.replace(/, (Australia|New Zealand)$/, "") ?? null,
    mine: r.user_id === organiser.id,
  }));

  return (
    <div className="space-y-6">
      <MarkSeen />
      <div>
        <h1 className="flex items-baseline gap-2 text-2xl font-semibold tracking-tight">
          What&apos;s new
          <span className="flex items-center gap-1.5 text-sm font-medium text-stone-400">
            <span
              className={`rounded px-1.5 text-xs font-medium ${STAGE_TAG_LIGHT}`}
            >
              {STAGE} {VERSION}
            </span>
            build {BUILD}
          </span>
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Recent changes to the Movement Hub
          {level === "god"
            ? ", with the technical detail."
            : level === "regional_lead"
              ? ", including what's new for Regional Support Leads."
              : "."}
        </p>
      </div>
      {COMING_SOON.length > 0 && (
        <section className="rounded-2xl border border-dashed border-cyan bg-cyan/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy">
            Coming soon
          </p>
          <ul className="mt-2 space-y-3">
            {COMING_SOON.map((c) => (
              <li key={c.title} className="text-sm">
                <p className="font-semibold text-navy">{c.title}</p>
                <p className="text-stone-700">{c.text}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Suggest list={suggestions} everyone={everyone} />
      {releases.map((r) => (
        <section
          key={r.date + r.title}
          className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-pink-ink">
            {new Date(r.date + "T12:00:00Z").toLocaleDateString("en-AU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <h2 className="mt-0.5 font-semibold">{r.title}</h2>
          <ul className="mt-2 space-y-2">
            {r.changes.map((c, i) => {
              const badge = BADGE[c.level];
              return (
                <li key={i} className="flex gap-2 text-sm text-stone-700">
                  <span aria-hidden className="mt-0.5 text-cyan">
                    ●
                  </span>
                  <span>
                    {badge && (
                      <span
                        className={`mr-1.5 inline-block rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${badge.tone}`}
                      >
                        {badge.label}
                      </span>
                    )}
                    <span
                      className={c.level === "god" ? "font-mono text-xs" : ""}
                    >
                      {c.text}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
