import { redirect } from "next/navigation";
import { requireOrganiser } from "@/lib/organiser";
import { RoleChip } from "@/components/role-chip";
import type { ViewRole } from "@/lib/roles";
import { NewTestAccount, SignInAs } from "./test-accounts";

type TestAccount = {
  person_id: string;
  user_id: string;
  name: string;
  team: string;
  role: ViewRole;
};

export default async function TestAccountsPage() {
  const { supabase, organiser } = await requireOrganiser();
  if (organiser.access !== "god") redirect("/");
  const { data } = await supabase.rpc("list_test_accounts");
  const accounts = (data as TestAccount[] | null) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Test accounts</h1>
        <p className="mt-1 text-sm text-stone-500">
          Pretend people you can delegate to, make buddies and so on, then sign
          in as to see exactly what they see. Only God Mode can see this page.
        </p>
      </div>

      <NewTestAccount communityName={organiser.team.name} />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Your test accounts{" "}
          <span className="text-stone-400">· {accounts.length}</span>
        </h2>
        {accounts.length === 0 ? (
          <p className="text-sm text-stone-500">None yet.</p>
        ) : (
          <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            {accounts.map((a) => (
              <li
                key={a.person_id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.name}</p>
                  <p className="truncate text-sm text-stone-500">{a.team}</p>
                </div>
                <RoleChip role={a.role} />
                <SignInAs personId={a.person_id} name={a.name} role={a.role} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
