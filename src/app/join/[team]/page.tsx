import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AttendeeShell } from "@/components/attendee-shell";
import { EmailCodeLogin } from "@/components/email-code-login";
import { JoinForm } from "./join-form";

// General sign-up page (what the team QR code at events points to).
export default async function JoinPage({ params }: PageProps<"/join/[team]">) {
  const { team } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: me } = await supabase
      .from("people")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (me) redirect("/me");
  }

  return (
    <AttendeeShell>
      <h1 className="text-3xl font-semibold tracking-tight">
        Join We The Free
      </h1>
      {user ? (
        <>
          <p className="mt-2 text-stone-600">
            A few details so organisers know who you are.
          </p>
          <JoinForm
            team={team}
            email={user.email ?? ""}
            firstName={String(user.user_metadata?.given_name ?? "")}
            lastName={String(user.user_metadata?.family_name ?? "")}
          />
        </>
      ) : (
        <>
          <p className="mt-2 text-stone-600">
            Sign up once, then organisers just tick you off at events. You can
            see the events you&apos;ve been to any time.
          </p>
          <div className="mt-8">
            <EmailCodeLogin next={`/join/${team}`} buttonLabel="Get started" />
          </div>
        </>
      )}
    </AttendeeShell>
  );
}
