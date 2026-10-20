import Link from "next/link";
import { requireOrganiser, ROLE_LABEL, type Access } from "@/lib/organiser";
import { LoadError } from "@/components/load-error";
import { RoleChip } from "@/components/role-chip";
import { AddRole } from "./add-role";

type RoleRow = {
  user_id: string;
  person_id: string | null;
  name: string;
  role: Access;
  team: string | null;
  region: string | null;
  can_manage: boolean;
};
export type Candidate = {
  person_id: string;
  name: string;
  team: string;
  role: Access | null;
};

const GIVES: Record<Access, Access[]> = {
  god: ["regional_lead", "organiser", "core_team"],
  regional_lead: ["organiser", "core_team"],
  organiser: ["core_team"],
  core_team: [],
};

const WHAT: Record<Access, string> = {
  god: "Everything, everywhere. Adds Regional Support Leads.",
  regional_lead: "Every community in their region. Adds Organisers.",
  organiser: "Runs one community: events, people, insights. Adds Core Team.",
  core_team: "Takes attendance for their community (names only).",
};

export default async function RolesPage() {
  const { supabase, organiser } = await requireOrganiser();
  const [roles, candidates, regions] = await Promise.all([
    supabase.rpc("list_roles"),
    supabase.rpc("role_candidates"),
    supabase.from("regions").select("id, name").order("sort_order"),
  ]);
  if (roles.error || candidates.error) return <LoadError what="roles" />;

  const viewRole = organiser.role as Access;
  const gives = GIVES[viewRole] ?? [];
  // God Mode is only visible to God Mode (also hidden while previewing other roles).
  const isGod = organiser.role === "god";
  const list = ((roles.data as RoleRow[]) ?? []).filter(
    (r) => isGod || r.role !== "god",
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
        <p className="mt-1 text-sm text-stone-500">
          You&apos;re {ROLE_LABEL[viewRole]}. You can give people{" "}
          {gives
            .map((g) => ROLE_LABEL[g])
            .join(", ")
            .replace(/, ([^,]*)$/, " or $1")}{" "}
          roles.
        </p>
      </div>

      <ol className="space-y-2">
        {(["god", "regional_lead", "organiser", "core_team"] as Access[])
          .filter((r) => isGod || r !== "god")
          .map((r) => (
            <li key={r} className="flex items-start gap-3 text-sm">
              <span className="w-44 shrink-0">
                <RoleChip role={r} />
              </span>
              <span className="text-stone-600">{WHAT[r]}</span>
            </li>
          ))}
      </ol>

      {gives.length > 0 && (
        <AddRole
          candidates={(candidates.data as Candidate[]) ?? []}
          roles={gives}
          regions={regions.data ?? []}
        />
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          People with roles{" "}
          <span className="text-stone-400">· {list.length}</span>
        </h2>
        <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {list.map((r) => (
            <li key={r.user_id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                {r.person_id ? (
                  <Link
                    href={`/people/${r.person_id}`}
                    className="truncate font-medium hover:underline"
                  >
                    {r.name}
                  </Link>
                ) : (
                  <p className="truncate font-medium">{r.name}</p>
                )}
                <p className="truncate text-sm text-stone-500">
                  {r.role === "god"
                    ? "All regions"
                    : r.role === "regional_lead"
                      ? r.region
                      : r.team}
                </p>
              </div>
              <RoleChip role={r.role} />
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-stone-500">
          To change someone&apos;s role, give them the new one above. Removing a
          role is coming soon.
        </p>
      </section>
    </div>
  );
}
