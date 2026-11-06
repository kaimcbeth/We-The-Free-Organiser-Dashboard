import { redirect } from "next/navigation";
import { requireOrganiser } from "@/lib/organiser";
import { KIND_COLUMNS, toSetupKind, type KindRow } from "@/lib/task-setup";
import { ActionRanking } from "./ranking";

// God only (Kai, 6 Nov 2026): every action a community can choose, in order
// of importance. "How much time do you have?" in Choose actions suggests
// from the top down until the time runs out.
export default async function ActionRankingPage() {
  const { supabase, organiser } = await requireOrganiser();
  if (organiser.access !== "god") redirect("/");
  const { data } = await supabase
    .from("task_kinds")
    .select(KIND_COLUMNS)
    .is("archived_at", null)
    .is("team_id", null)
    .eq("audience", "community")
    .not("schedule", "in", "(follow_up,special,pod)")
    .order("tier", { ascending: true, nullsFirst: false })
    .order("importance", { ascending: true, nullsFirst: false })
    .order("sort_order");
  const kinds = ((data ?? []) as unknown as KindRow[]).map(toSetupKind);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-navy">Action ranking</h1>
      <p className="mt-1 text-sm text-stone-600">
        Every action a community can choose, most important first. When an
        organiser says how much time they have, Choose actions suggests from the
        top down until their time runs out. Drag to reorder or to move an action
        to another section, or use the arrows. Only you see this page.
      </p>
      <ActionRanking initial={kinds} />
    </div>
  );
}
