import Link from "next/link";

// "New here? Create your free account": what an account gets you, for people
// without one (Outreach guide, upcoming events). Keep both the same.
export function AccountPrompt({ href }: { href: string }) {
  return (
    <div className="mt-4 rounded-2xl bg-pink/15 px-4 py-4 text-navy ring-1 ring-pink/40">
      <p className="font-semibold">New here? Create your free account</p>
      <p className="mt-0.5 text-sm text-stone-700">
        It takes a minute, and you&apos;ll get:
      </p>
      <ul className="mt-2 space-y-1 text-sm text-stone-700">
        <li>
          <span aria-hidden className="mr-1.5">
            📅
          </span>
          Upcoming events in one place, with a reminder the day before
        </li>
        <li>
          <span aria-hidden className="mr-1.5">
            📸
          </span>
          The Photo Hub: photos from every event you come to
        </li>
        <li>
          <span aria-hidden className="mr-1.5">
            📈
          </span>
          Your impact, tracked as you go: events, milestones and more
        </li>
        <li>
          <span aria-hidden className="mr-1.5">
            💡
          </span>
          A way to send feedback and ideas straight to the organisers
        </li>
      </ul>
      <Link
        href={href}
        className="mt-3 inline-block rounded-xl bg-pink px-4 py-2 text-sm font-semibold text-navy hover:bg-pink-strong"
      >
        Create my account
      </Link>
    </div>
  );
}
