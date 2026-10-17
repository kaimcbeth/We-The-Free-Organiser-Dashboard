import Link from "next/link";
import { EmailCodeLogin } from "@/components/email-code-login";
import { DEFAULT_TEAM_SLUG } from "@/lib/teams";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-pink-ink">We The Free</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Log in</h1>
        <div className="mt-8">
          <EmailCodeLogin next="/" />
        </div>
        <p className="mt-8 text-sm text-stone-500">
          New here?{" "}
          <Link href={`/join/${DEFAULT_TEAM_SLUG}`} className="font-medium text-pink-ink">
            Join We The Free Sydney
          </Link>
        </p>
      </div>
    </main>
  );
}
