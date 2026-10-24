import { requireCore } from "@/lib/organiser";
import { loadMyTasks } from "@/lib/tasks";
import { TaskCard } from "@/components/task-card";
import { CORE_ROLES, type CoreRole } from "@/lib/roles";
import { CoreTaskSetup, type SetupTask } from "./core-task-setup";

type Setup = {
  person_id: string;
  away_until: string | null;
  roles: CoreRole[];
  tasks: {
    kind: string;
    title: string;
    blurb: string | null;
    core_role: CoreRole;
    estimate: number;
    estimate_max: number | null;
    schedule: string;
    anchor: string;
    appear_hours: number;
    owner_id: string | null;
    owner_name: string | null;
    helper_id: string | null;
  }[];
  helpers: { id: string; name: string }[];
} | null;

function when(t: { schedule: string; anchor: string; appear_hours: number }) {
  if (t.schedule === "weekly") return "Every week";
  if (t.schedule === "monthly") return "Every month";
  if (t.schedule === "quarterly") return "Every 3 months";
  if (t.anchor === "end") return "After events";
  return t.appear_hours < 0 ? "Before events" : "At events";
}

// A Core Team member's tasks: what's on now, and which tasks they look after.
export default async function CoreTasksPage() {
  const { supabase, organiser } = await requireCore();
  const preview = organiser.coreSetupPreview;

  let setup: Setup = null;
  if (preview) {
    // God Mode "View as New Core Team member": every lead role, nothing saved.
    const [{ data: kinds }, { data: people }] = await Promise.all([
      supabase
        .from("task_kinds")
        .select(
          "kind, title, blurb, core_role, estimate_minutes, estimate_max_minutes, schedule, anchor, appear_hours",
        )
        .not("core_role", "is", null)
        .is("archived_at", null)
        .is("team_id", null)
        .order("sort_order"),
      supabase
        .from("people")
        .select("id, first_name, last_name")
        .eq("team_id", organiser.team_id)
        .not("user_id", "is", null)
        .order("first_name")
        .limit(30),
    ]);
    setup = {
      person_id: "preview",
      away_until: null,
      roles: CORE_ROLES,
      tasks: (kinds ?? []).map((k) => ({
        ...k,
        estimate: k.estimate_minutes,
        estimate_max: k.estimate_max_minutes,
        owner_id: null,
        owner_name: null,
        helper_id: null,
      })),
      helpers: (people ?? []).map((p) => ({
        id: p.id,
        name: [p.first_name, p.last_name].filter(Boolean).join(" "),
      })),
    };
  } else {
    const { data } = await supabase.rpc("my_core_setup");
    setup = data as Setup;
  }

  const myTasks =
    setup && !preview ? await loadMyTasks(supabase, setup.person_id) : [];
  // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
  const now = Date.now();

  const tasks: SetupTask[] = (setup?.tasks ?? []).map((t) => ({
    kind: t.kind,
    title: t.title,
    blurb: t.blurb,
    coreRole: t.core_role,
    estimate: t.estimate_max
      ? `${t.estimate}–${t.estimate_max}`
      : `${t.estimate}`,
    when: when(t),
    ownerId: t.owner_id,
    ownerName: t.owner_name,
    helperId: t.helper_id,
  }));

  return (
    <div className="space-y-8">
      {myTasks.length > 0 && (
        <section>
          <h1 className="mb-3 text-2xl font-semibold tracking-tight">
            Your actions
          </h1>
          <ul className="space-y-3">
            {myTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                tz={organiser.team.timezone}
                now={now}
                whatsappUrl={organiser.team.whatsapp_url}
              />
            ))}
          </ul>
        </section>
      )}

      {!setup || setup.roles.length === 0 ? (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Core Team actions
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Once an organiser gives you a lead role (Community, Events or
            Promo), you&apos;ll pick the actions you&apos;ll look after here.
          </p>
        </div>
      ) : (
        <CoreTaskSetup
          myId={setup.person_id}
          roles={setup.roles}
          tasks={tasks}
          helpers={setup.helpers}
          awayUntil={setup.away_until}
          preview={preview}
          today={new Date(now).toISOString().slice(0, 10)}
        />
      )}
    </div>
  );
}
