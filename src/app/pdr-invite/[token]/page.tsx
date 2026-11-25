import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AttendeeShell } from "@/components/attendee-shell";
import { EmailCodeLogin } from "@/components/email-code-login";
import { KIND_LABEL, formatMeeting, type PdrKind } from "@/lib/pdr";
import { ClaimForm } from "./claim-form";

// The link in the PDR email (0256). Also an RSL's way into the Hub: someone
// without an account makes one here and becomes the RSL for the PDR's region.
export default async function PdrInvitePage({
  params,
}: PageProps<"/pdr-invite/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const [{ data }, { data: auth }] = await Promise.all([
    supabase.rpc("pdr_invite_info", { p_token: token }),
    supabase.auth.getUser(),
  ]);
  const info = data as {
    id: string;
    name: string;
    reviewer: string | null;
    kind: PdrKind;
    year: number;
    meeting_at: string | null;
    timezone: string;
    region: string | null;
    claimed: boolean;
    mine: boolean;
  } | null;
  const user = auth.user;

  if (!info)
    return (
      <AttendeeShell>
        <h1 className="text-2xl font-semibold tracking-tight">
          This link isn&apos;t valid
        </h1>
        <p className="mt-2 text-stone-600">
          Ask your community manager for a new one.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block font-medium text-pink-ink hover:underline"
        >
          Go to the Movement Hub
        </Link>
      </AttendeeShell>
    );

  if (user && info.mine) redirect(`/pdr/${info.id}`);

  const first = info.name.split(" ")[0];
  return (
    <AttendeeShell>
      <h1 className="text-3xl font-semibold tracking-tight">
        Hi {first}, your PDR is ready
      </h1>
      <p className="mt-2 text-stone-600">
        {info.reviewer ?? "Your community manager"} has started your{" "}
        {KIND_LABEL[info.kind].toLowerCase()} {info.year}
        {info.region ? ` as RSL for ${info.region}` : ""}. Fill in your draft on
        the Movement Hub before the meeting, then you&apos;ll go through it
        together.
      </p>
      {info.meeting_at && (
        <p className="mt-2 text-sm font-medium text-navy">
          Meeting: {formatMeeting(info.meeting_at, info.timezone)}
        </p>
      )}
      <div className="mt-8">
        {user ? (
          <ClaimForm token={token} email={user.email ?? ""} name={info.name} />
        ) : (
          <>
            <p className="mb-3 text-sm text-stone-600">
              Pop in your email to log in or make your account (it takes 30
              seconds).
            </p>
            <EmailCodeLogin
              next={`/pdr-invite/${token}`}
              buttonLabel="Email me a login link"
            />
          </>
        )}
      </div>
    </AttendeeShell>
  );
}
