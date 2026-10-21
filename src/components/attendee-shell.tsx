// Simple branded frame for attendee-facing pages (join, invite, my profile).
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
          <span className="text-sm font-bold uppercase tracking-wider text-pink">
            Movement Hub
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
