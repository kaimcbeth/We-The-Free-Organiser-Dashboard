import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AttendeeShell } from "@/components/attendee-shell";
import { FeedbackForm } from "./feedback-form";

// The volunteer feedback form (no login; a secret link per community).
export default async function FeedbackPage({
  params,
}: PageProps<"/feedback/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("feedback_form", { p_token: token });
  const team = (data as { team_name: string }[] | null)?.[0]?.team_name;
  if (!team) notFound();
  const community = team.replace(/, (Australia|New Zealand)$/, "");
  return (
    <AttendeeShell>
      <h1 className="text-3xl font-semibold tracking-tight">
        How&apos;s it going?
      </h1>
      <p className="mt-2 text-stone-600">
        A few quick questions for We The Free {community} volunteers. Your
        organisers read every answer, and it helps us make things better.
      </p>
      <FeedbackForm token={token} />
    </AttendeeShell>
  );
}
