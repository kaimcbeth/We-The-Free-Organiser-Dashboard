import { RESOURCE_SECTIONS } from "@/lib/resources";

// The Resources & Training page (organisers and the Core Team).
export function ResourcesList() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Resources &amp; Training
      </h1>
      <p className="mt-1 text-sm text-stone-600">
        Guides and documents for running events. More coming soon.
      </p>
      {RESOURCE_SECTIONS.map((s) => (
        <section key={s.title} className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
            {s.title}
          </h2>
          <ul className="space-y-3">
            {s.items.map((r) => (
              <li
                key={r.file}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{r.title}</h3>
                  {r.area && (
                    <span className="rounded-full bg-cyan/25 px-2 py-0.5 text-xs font-semibold text-navy">
                      {r.area}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-stone-600">{r.about}</p>
                {r.tip && (
                  <p className="mt-1 text-xs text-stone-500">{r.tip}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <a
                    href={r.file}
                    target="_blank"
                    rel="noopener"
                    className="rounded-xl bg-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy-2"
                  >
                    Open
                  </a>
                  <a
                    href={r.file}
                    download
                    className="rounded-xl px-3 py-1.5 text-sm font-semibold text-navy ring-1 ring-black/10 hover:bg-white"
                  >
                    Download
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
