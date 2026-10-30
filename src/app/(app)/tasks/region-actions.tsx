import { TaskCard, type TaskRow } from "@/components/task-card";

// Region-wide Regional Support Lead actions (e.g. promoting an Organiser
// Hangout): not tied to one community, so shown on their own.
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
  return (
    <section>
      <h2 className="mb-3 font-semibold">{title}</h2>
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
