// Simple branded frame for attendee-facing pages (join, invite, my profile).
import { EasterEggLogo } from "@/components/easter-egg-logo";
export function AttendeeShell({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <span className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- small static logo */}
            <img
              src="/brand/wtf-logo.png"
              alt="We The Free"
              className="h-9 w-auto"
            />
            <EasterEggLogo className="text-xs font-bold uppercase tracking-wider text-pink" />
          </span>
          {right}
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-16 pt-8">
        {children}
      </main>
    </div>
  );
}
