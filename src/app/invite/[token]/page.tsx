import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AttendeeShell } from "@/components/attendee-shell";
import { EmailCodeLogin } from "@/components/email-code-login";
import { ConnectButton } from "./connect-button";

// Personal connect link / QR code that an organiser shows to one person.
export default async function InvitePage({
  params,
}: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const supabase = await createClient();

  const [{ data: rows }, { data: auth }] = await Promise.all([
    supabase.rpc("get_invite", { p_token: token }),
    supabase.auth.getUser(),
  ]);
  const invite = (
    rows as { first_name: string; team_name: string; status: string }[] | null
  )?.[0];
  const user = auth.user;

  if (!invite) {
    return (
      <AttendeeShell>
        <h1 className="text-2xl font-semibold tracking-tight">
          This link isn&apos;t valid
        </h1>
        <p className="mt-2 text-stone-600">
          Ask an organiser to show you a new connect QR code.
        </p>
      </AttendeeShell>
    );
  }

  if (invite.status === "used") {
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
        <h1 className="text-2xl font-semibold tracking-tight">
          Already connected
        </h1>
        <p className="mt-2 text-stone-600">
          This invite has already been used. If that was you,{" "}
          <Link href="/login" className="font-medium text-pink-ink">
            log in
          </Link>{" "}
          to see your events.
        </p>
      </AttendeeShell>
    );
  }

  if (invite.status === "expired") {
    return (
      <AttendeeShell>
        <h1 className="text-2xl font-semibold tracking-tight">
          This invite has expired
        </h1>
        <p className="mt-2 text-stone-600">
          Ask an organiser to show you a new connect QR code.
        </p>
      </AttendeeShell>
    );
  }

  return (
    <AttendeeShell>
      <h1 className="text-3xl font-semibold tracking-tight">
        Hi {invite.first_name}!
      </h1>
      <p className="mt-2 text-stone-600">
        {invite.team_name} organisers have added you. Connect your account to
        see the events you&apos;ve been to and keep your details up to date.
      </p>
      <div className="mt-8">
        {user ? (
          <ConnectButton
            token={token}
            firstName={invite.first_name}
            email={user.email ?? ""}
          />
        ) : (
          <EmailCodeLogin
            next={`/invite/${token}`}
            buttonLabel="Email me a login link"
          />
        )}
      </div>
    </AttendeeShell>
  );
}
