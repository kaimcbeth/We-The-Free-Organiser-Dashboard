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
      <a
        href="/me/welcome"
        className="mt-6 block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 hover:ring-pink"
      >
        <p className="font-semibold">
          <span className="mr-1.5">👋</span>Welcome to We The Free
        </p>
        <p className="mt-1 text-sm text-stone-600">
          Who we are, what we stand for and what to expect at an event.
        </p>
      </a>
      <a
        href="https://activism.wtf/ibc/masterclass"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 hover:ring-pink"
      >
        <p className="font-semibold">
          <span className="mr-1.5">🎓</span>IBC Masterclass ↗
        </p>
        <p className="mt-1 text-sm text-stone-600">
          The full Inspiring Behaviour Change handout: how to stop debating and
          start coaching, the 15 questions, handling objections, role plays and
          an AI practice tool.
        </p>
      </a>
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
