import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuestionSheet } from "@/components/question-sheet";
import { GuideShare } from "@/components/guide-share";

// Outreach tab: the conversation questions, plus the QR to share them.
// (The public version, for newcomers without an account, is /guide.)
export default async function MemberGuidePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/guide");
  const { data: me } = await supabase
    .from("people")
    .select("id, team:teams!people_team_id_fkey(slug)")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; team: { slug: string } | null }>();
  if (!me) redirect("/guide");
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Outreach guide</h1>
      <div className="mt-5">
        <QuestionSheet />
      </div>
      {me.team?.slug && (
        <div className="mt-6 text-center">
          <GuideShare slug={me.team.slug} />
        </div>
      )}
    </>
  );
}
