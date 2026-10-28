import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AttendeeShell } from "@/components/attendee-shell";
import { QuestionSheet } from "@/components/question-sheet";
import { GuideShare } from "@/components/guide-share";

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
        .select("id, team:teams(slug)")
        .eq("user_id", user.id)
        .maybeSingle<{ id: string; team: { slug: string } | null }>()
    : { data: null };
  // Organisers without a member profile can still share their community's QR.
  const { data: org } =
    user && !me
      ? await supabase
          .from("organisers")
          .select("team:teams(slug)")
          .eq("id", user.id)
          .maybeSingle<{ team: { slug: string } | null }>()
      : { data: null };
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
        <Link
          href={asked ? `/join/${asked}` : "/login"}
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-pink/15 px-4 py-3 text-navy ring-1 ring-pink/40 hover:bg-pink/25"
        >
          <span>
            <span className="block font-semibold">
              New here? Create your account
            </span>
            <span className="block text-sm text-stone-700">
              Takes a minute. Organisers can tick you off at events and you can
              see your impact.
            </span>
          </span>
          <span aria-hidden className="text-xl">
            →
          </span>
        </Link>
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
