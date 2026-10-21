import { redirect } from "next/navigation";
import { requireOrganiser } from "@/lib/organiser";
import type { ViewRole } from "@/lib/roles";
import { TestRole, SignInAs } from "./test-accounts";

type TestPerson = { person_id: string; name: string; role: ViewRole };

export default async function TestAccountsPage() {
  const { supabase, organiser } = await requireOrganiser();
  if (organiser.access !== "god") redirect("/");
  const { data } = await supabase.rpc("test_person", {
    p_team_id: organiser.team_id,
  });
  const person = data as TestPerson | null;
  const community = organiser.team.name.replace(
    /, (Australia|New Zealand)$/,
    "",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Test account</h1>
        <p className="mt-1 text-sm text-stone-500">
          Every community has a hidden test account, Fergus. Only God Mode can
          see them. To everyone else they don&apos;t exist. Delegate to them,
          tick them in, make them a buddy, then sign in as them to see exactly
          what they see.
        </p>
      </div>

      {!person ? (
        <p className="text-sm text-stone-500">
          No test person in {community} yet.
        </p>
      ) : (
        <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{person.name}</p>
              <p className="text-sm text-stone-500">{community}</p>
            </div>
            <SignInAs
              personId={person.person_id}
              name={person.name}
              role={person.role}
            />
          </div>
          <TestRole personId={person.person_id} current={person.role} />
        </section>
      )}
    </div>
  );
}
