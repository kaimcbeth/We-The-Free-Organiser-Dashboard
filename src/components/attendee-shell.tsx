// Simple branded frame for attendee-facing pages (join, invite, my profile).
import { EasterEggLogo } from "@/components/easter-egg-logo";
import { STAGE, VERSION, BUILD } from "@/lib/changelog";

// With `community`, the header matches the organiser Hub's (mark, Movement Hub
// and version, community name).
export function AttendeeShell({
  children,
  right,
  community,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
  community?: string | null;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          {community !== undefined ? (
            <span className="flex min-w-0 items-center gap-2.5 leading-tight">
              {/* eslint-disable-next-line @next/next/no-img-element -- small static logo */}
              <img
                src="/brand/wtf-mark.png"
                alt="We The Free"
                className="h-9 w-auto shrink-0"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <EasterEggLogo className="block text-xs font-bold uppercase tracking-wider text-pink" />
                  <span
                    title={`${STAGE} ${VERSION}, build ${BUILD}`}
                    className="rounded bg-white/10 px-1 text-[10px] font-medium leading-4 text-white/60"
                  >
                    {STAGE} {VERSION}
                  </span>
                </span>
                <span className="block truncate text-sm font-medium text-white">
                  {community ?? "Your community"}
                </span>
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- small static logo */}
              <img
                src="/brand/wtf-logo.png"
                alt="We The Free"
                className="h-9 w-auto"
              />
              <EasterEggLogo className="text-xs font-bold uppercase tracking-wider text-pink" />
            </span>
          )}
          {right}
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-16 pt-8">
        {children}
      </main>
    </div>
  );
}
