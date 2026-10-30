import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AttendeeShell } from "@/components/attendee-shell";
import { TellForm } from "./tell-form";

// Members' feedback for their organisers, by link (no login): one box,
// name optional. Organisers share it from Resources.
export default async function TellPage({ params }: PageProps<"/tell/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("feedback_form", { p_token: token });
  const team = (data as { team_name: string }[] | null)?.[0]?.team_name;
  if (!team) notFound();
  const community = team.replace(/, (Australia|New Zealand)$/, "");
  return (
    <AttendeeShell>
      <h1 className="text-3xl font-semibold tracking-tight">
        Feedback for your organisers
      </h1>
      <p className="mt-2 text-stone-600">
        Anything you&apos;d like the We The Free {community} organisers to know:
        what&apos;s working, what could be better, ideas, worries. Every message
        gets read. Leave your name off if you like.
      </p>
      <TellForm token={token} />
    </AttendeeShell>
  );
}
