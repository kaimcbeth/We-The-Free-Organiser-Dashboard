import { RESOURCE_SECTIONS } from "@/lib/resources";

// Resources for members. Starts with the legal resources.
export default function MemberResourcesPage() {
  const items = RESOURCE_SECTIONS.flatMap((s) => s.items).filter(
    (r) => r.members,
  );
  const groups = [...new Set(items.map((r) => r.members!))];
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Resources</h1>
      <p className="mt-1 text-stone-600">
        Handy to have on your phone at events.
      </p>
      {groups.map((g) => (
        <section key={g}>
          <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-stone-500">
            {g}
          </h2>
          <ul className="space-y-3">
            {items
              .filter((r) => r.members === g)
              .map((r) => (
                <li key={r.file}>
                  <a
                    href={r.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 hover:ring-pink"
                  >
                    <p className="font-semibold">
                      {r.emoji && <span className="mr-1.5">{r.emoji}</span>}
                      {r.title}
                      {r.area && (
                        <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
                          {r.area}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">{r.about}</p>
                  </a>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}
