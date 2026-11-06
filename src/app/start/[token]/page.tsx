import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AttendeeShell } from "@/components/attendee-shell";
import { EmailCodeLogin } from "@/components/email-code-login";
import { StartForm } from "./start-form";

// One-use link that makes someone an organiser (or Core Team) of a community
// (Kai, 6 Nov 2026: "a direct link to add the new Gold Coast organiser and let
// them make an account"). Made with create_role_invite (0213).
export default async function StartPage({
  params,
}: PageProps<"/start/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const [{ data }, { data: auth }] = await Promise.all([
    supabase.rpc("role_invite_info", { p_token: token }),
    supabase.auth.getUser(),
  ]);
  const info = data as { team: string; access: string; status: string } | null;
  const user = auth.user;
  const community = info?.team.replace(/, .*$/, "") ?? "";
  const role = info?.access === "core_team" ? "Core Team" : "an organiser";

  if (!info || info.status !== "ok") {
    return (
      <AttendeeShell>
        <h1 className="text-2xl font-semibold tracking-tight">
          {!info
            ? "This link isn't valid"
            : info.status === "used"
              ? "This link has been used"
              : "This link has expired"}
        </h1>
        <p className="mt-2 text-stone-600">
          {info?.status === "used"
            ? "If that was you, you're all set: just log in."
            : "Ask whoever sent it for a new one."}
        </p>
        <Link
          href="/"
          className="mt-6 inline-block font-medium text-pink-ink hover:underline"
        >
          Go to the Movement Hub
        </Link>
      </AttendeeShell>
    );
  }

  return (
    <AttendeeShell>
      <h1 className="text-3xl font-semibold tracking-tight">
        Welcome to the Movement Hub
      </h1>
      <p className="mt-2 text-stone-600">
        You&apos;ve been invited to be {role} for We The Free {community}.
        {user
          ? " Add your name and you're in."
          : " Pop in your email to make your account (it takes 30 seconds), then add your name."}
      </p>
      <div className="mt-8">
        {user ? (
          <StartForm token={token} email={user.email ?? ""} />
        ) : (
          <EmailCodeLogin
            next={`/start/${token}`}
            buttonLabel="Email me a login link"
          />
        )}
      </div>
    </AttendeeShell>
  );
}
