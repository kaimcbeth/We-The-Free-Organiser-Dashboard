import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AttendeeShell } from "@/components/attendee-shell";
import { QuestionSheet } from "@/components/question-sheet";
import { GuideShare } from "@/components/guide-share";
import { AccountPrompt } from "@/components/account-prompt";

// The Outreach guide: just the conversation questions. Public, so a newcomer
// can scan a QR code and have it straight away; anyone without an account
// sees a small prompt to create one (it never blocks the questions).
export default async function GuidePage({ searchParams }: PageProps<"/guide">) {
  const { c } = await searchParams;
  const asked = typeof c === "string" && /^[a-z0-9-]{1,60}$/.test(c) ? c : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase
        .from("people")
        .select("id, team:teams!people_team_id_fkey(slug)")
        .eq("user_id", user.id)
        .maybeSingle<{ id: string; team: { slug: string } | null }>()
    : { data: null };
  // Organisers without a member profile can still share their community's QR.
  const { data: org } = user
    ? await supabase
        .from("organisers")
        .select("team:teams(slug)")
        .eq("id", user.id)
        .maybeSingle<{ team: { slug: string } | null }>()
    : { data: null };
  if (me && !org) redirect("/me/guide"); // members get it as a tab
  const slug = me?.team?.slug ?? org?.team?.slug ?? asked;

  return (
    <AttendeeShell
      right={
        me ? (
          <Link
            href="/me"
            className="rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            Back
          </Link>
        ) : undefined
      }
    >
      <h1 className="text-3xl font-semibold tracking-tight">Outreach guide</h1>

      {!me && !org && (
        <AccountPrompt href={asked ? `/join/${asked}` : "/login"} />
      )}

      <div className="mt-5">
        <QuestionSheet />
      </div>

      {slug && (me || org) && (
        <div className="mt-6 text-center">
          <GuideShare slug={slug} />
        </div>
      )}
    </AttendeeShell>
  );
}
