import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AttendeeShell } from "@/components/attendee-shell";
import { WelcomeFlow } from "@/components/welcome-flow";

// Welcome to We The Free: mission and values for new members.
export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <AttendeeShell
      right={
        <Link
          href="/me"
          className="rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          Skip
        </Link>
      }
    >
      <WelcomeFlow doneHref="/me#coming-up" />
    </AttendeeShell>
  );
}
