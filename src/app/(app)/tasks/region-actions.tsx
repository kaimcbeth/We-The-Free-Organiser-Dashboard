import { TaskCard, type TaskRow } from "@/components/task-card";
import { isRslSocial } from "@/lib/rsl-social";

// Region-wide Regional Support Lead actions (e.g. promoting an Organiser
// Hangout): not tied to one community, so shown on their own. Posts for the
// regional social media pages get their own "Social media" section (Kai,
// 6 Nov 2026).
export function RegionActions({
  tasks,
  tz,
  now,
  title = "For your region",
}: {
  tasks: TaskRow[];
  tz: string;
  now: number;
  title?: string;
}) {
  if (!tasks.length) return null;
  const social = tasks.filter((t) => isRslSocial(t.kind));
  const rest = tasks.filter((t) => !isRslSocial(t.kind));
  return (
    <>
      <Section title={title} tasks={rest} tz={tz} now={now} />
      <Section
        title="Social media"
        note="For your regional Instagram and Facebook pages"
        tasks={social}
        tz={tz}
        now={now}
      />
    </>
  );
}

function Section({
  title,
  note,
  tasks,
  tz,
  now,
}: {
  title: string;
  note?: string;
  tasks: TaskRow[];
  tz: string;
  now: number;
}) {
  if (!tasks.length) return null;
  return (
    <section>
      <h2 className={`font-semibold ${note ? "" : "mb-3"}`}>{title}</h2>
      {note && <p className="mb-3 text-sm text-stone-500">{note}</p>}
      <ul className="space-y-3">
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            tz={tz}
            now={now}
            whatsappUrl={null}
            removable
          />
        ))}
      </ul>
    </section>
  );
}
