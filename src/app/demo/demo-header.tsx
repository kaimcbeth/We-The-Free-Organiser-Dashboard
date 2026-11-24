// Navy top bar for the public demo pages (no login, nothing saved).
export function DemoHeader() {
  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- small static logo */}
        <img
          src="/brand/wtf-mark.png"
          alt="We The Free"
          className="h-9 w-auto"
        />
        <span className="leading-tight">
          <span className="block text-xs font-bold uppercase tracking-wider text-pink">
            Movement Hub
          </span>
          <span className="block text-sm font-medium">Demo</span>
        </span>
      </div>
    </header>
  );
}
