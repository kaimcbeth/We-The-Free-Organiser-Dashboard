import { requireOrganiser } from "@/lib/organiser";
import type { OrgGoal, PdrSummary } from "@/lib/pdr";
import { PdrHome, type Person, type Region, type Reviewer } from "./pdr-home";

// PDRs (Kai, 26 Nov 2026; 0256). The community manager (whoever has the
// "runs PDRs" switch) sees every RSL's PDR and starts new ones; an RSL sees
// their own.
export default async function PdrPage() {
  const { supabase } = await requireOrganiser();
  const year = new Date().getFullYear();
  const [list, people, reviewers, goalsNow, goalsNext] = await Promise.all([
    supabase.rpc("pdr_list"),
    supabase.rpc("pdr_people"),
    supabase.rpc("pdr_reviewers"),
    supabase.rpc("pdr_org_goals", { p_year: year }),
    supabase.rpc("pdr_org_goals", { p_year: year + 1 }),
  ]);
  const p = people.data as { people: Person[]; regions: Region[] } | null;
  return (
    <PdrHome
      pdrs={(list.data as PdrSummary[] | null) ?? []}
      reviewer={!!p}
      people={p?.people ?? []}
      regions={p?.regions ?? []}
      reviewers={(reviewers.data as Reviewer[] | null) ?? []}
      goals={{
        [year]: (goalsNow.data as OrgGoal[] | null) ?? [],
        [year + 1]: (goalsNext.data as OrgGoal[] | null) ?? [],
      }}
      notReady={!!list.error}
    />
  );
}
