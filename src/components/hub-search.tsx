"use client";

// Search (Kai, 12 Nov 2026, idea 10): one box in the organiser header for
// people, events, open actions and Hub pages. Ctrl/Cmd + K opens it.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/sheet";
import { RESOURCE_SECTIONS } from "@/lib/resources";

type Hit = { key: string; label: string; sub?: string; href: string };
type Group = { title: string; hits: Hit[] };

// Hub pages and resources, with extra words people might type.
const PAGES: { label: string; href: string; words?: string }[] = [
  { label: "Events", href: "/", words: "calendar upcoming past check-in" },
  { label: "Show all past events", href: "/?past=all", words: "history old" },
  { label: "Calendar", href: "/calendar" },
  { label: "Actions", href: "/tasks", words: "tasks to do plan" },
  {
    label: "Organiser chats",
    href: "/chats",
    words: "beeper whatsapp messages reply rsl",
  },
  { label: "People", href: "/people", words: "members contacts" },
  {
    label: "Insights",
    href: "/insights",
    words: "stats numbers growth charts",
  },
  { label: "Resources", href: "/resources" },
  { label: "Photo Hub", href: "/resources", words: "photos pictures images" },
  { label: "Funding", href: "/funding", words: "money budget sponsors" },
  {
    label: "Equipment",
    href: "/resources/equipment",
    words: "gear kit signs banner table",
  },
  {
    label: "Recommended prizes",
    href: "/resources/prizes",
    words: "snacks lollies donuts",
  },
  {
    label: "Movie player",
    href: "/resources/movie-player",
    words: "films laptops 3mmc movie challenge",
  },
  {
    label: "Discussion prompts",
    href: "/resources/prompts",
    words: "group chat questions",
  },
  {
    label: "Sign splitter",
    href: "/resources/signs",
    words: "print a3 posters",
  },
  {
    label: "Social Media Hub",
    href: "/resources/social",
    words: "instagram posts planner graphic",
  },
  { label: "Feedback inbox", href: "/feedback-inbox", words: "members said" },
  { label: "Facebook groups", href: "/facebook-groups" },
  { label: "What's new", href: "/whats-new", words: "changelog updates" },
  { label: "Outreach guide", href: "/guide", words: "questions conversation" },
];

const clean = (s: string) => s.replace(/[,()%*\\]/g, " ").trim();
const has = (text: string, q: string) =>
  q
    .toLowerCase()
    .split(/\s+/)
    .every((w) => text.toLowerCase().includes(w));

export function HubSearch({
  teamIds,
  timezone,
}: {
  teamIds: string[];
  timezone: string;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/85 hover:bg-white/10"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white px-2 py-1 text-xs font-medium text-navy opacity-0 shadow-md ring-1 ring-black/10 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          Search
        </span>
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      </button>
      {open && (
        <Sheet title="Search" onClose={() => setOpen(false)}>
          <SearchBox
            teamIds={teamIds}
            timezone={timezone}
            onGo={() => setOpen(false)}
          />
        </Sheet>
      )}
    </>
  );
}

export function SearchBox({
  teamIds,
  timezone,
  onGo,
}: {
  teamIds: string[];
  timezone: string;
  onGo: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ q: string; groups: Group[] } | null>(
    null,
  );
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  const query = q.trim();
  const pages = useMemo<Group>(() => {
    const hits: Hit[] = [];
    if (query.length >= 2) {
      for (const p of PAGES)
        if (has(`${p.label} ${p.words ?? ""}`, query))
          hits.push({ key: `page:${p.label}`, label: p.label, href: p.href });
      for (const s of RESOURCE_SECTIONS)
        for (const r of s.items)
          if (has(`${r.title} ${r.about}`, query))
            hits.push({
              key: `res:${r.title}`,
              label: `${r.emoji} ${r.title}`,
              sub: s.title,
              href: r.file,
            });
    }
    return { title: "Pages", hits: hits.slice(0, 6) };
  }, [query]);

  useEffect(() => {
    const term = clean(query);
    if (term.length < 2 || teamIds.length === 0) return;
    let live = true;
    const t = setTimeout(async () => {
      const supabase = createClient();
      const first = term.split(/\s+/)[0];
      const like = `%${first}%`;
      const day = new Intl.DateTimeFormat("en-AU", {
        timeZone: timezone,
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const [people, events, tasks] = await Promise.all([
        supabase
          .from("people")
          .select("id, first_name, last_name, email, phone")
          .in("team_id", teamIds)
          .eq("is_test", false)
          .or(
            `first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`,
          )
          .limit(40),
        supabase
          .from("events")
          .select("id, title, starts_at")
          .in("team_id", teamIds)
          .ilike("title", like)
          .order("starts_at", { ascending: false })
          .limit(60),
        supabase
          .from("tasks")
          .select("id, due_at, kind:task_kinds!inner(title)")
          .in("team_id", teamIds)
          .is("done_at", null)
          .is("dismissed_at", null)
          .neq("kind", "pod_boost")
          .ilike("kind.title", like)
          .order("due_at")
          .limit(20),
      ]);
      if (!live) return;
      const now = new Date().toISOString();
      const ppl = (people.data ?? [])
        .filter((p) =>
          has(
            `${p.first_name} ${p.last_name ?? ""} ${p.email ?? ""} ${p.phone ?? ""}`,
            term,
          ),
        )
        .slice(0, 8)
        .map((p) => ({
          key: `p:${p.id}`,
          label: [p.first_name, p.last_name].filter(Boolean).join(" "),
          sub: p.email ?? p.phone ?? undefined,
          href: `/people/${p.id}`,
        }));
      const evs = (events.data ?? []).filter((e) => has(e.title, term));
      // Coming up (soonest first), then past (newest first).
      const upcoming = evs.filter((e) => e.starts_at >= now).reverse();
      const past = evs.filter((e) => e.starts_at < now);
      const evHits = [...upcoming, ...past].slice(0, 8).map((e) => ({
        key: `e:${e.id}`,
        label: e.title,
        sub: `${day.format(new Date(e.starts_at))}${e.starts_at >= now ? " · coming up" : ""}`,
        href: `/events/${e.id}`,
      }));
      const seen = new Set<string>();
      const actHits: Hit[] = [];
      for (const t of tasks.data ?? []) {
        const title = (t.kind as unknown as { title: string }).title;
        if (!has(title, term) || seen.has(title)) continue;
        seen.add(title);
        actHits.push({
          key: `t:${t.id}`,
          label: title,
          sub: t.due_at ? `Due ${day.format(new Date(t.due_at))}` : undefined,
          href: "/tasks",
        });
      }
      setFound({
        q: term,
        groups: [
          { title: "People", hits: ppl },
          { title: "Events", hits: evHits },
          { title: "Open actions", hits: actHits.slice(0, 5) },
        ],
      });
      setActive(0);
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query, teamIds, timezone]);

  const current = found && found.q === clean(query) ? found.groups : [];
  const groups = [...current.slice(0, 2), pages, ...current.slice(2)].filter(
    (g) => g.hits.length,
  );
  const flat = groups.flatMap((g) => g.hits);
  const loading = query.length >= 2 && (!found || found.q !== clean(query));

  function go(h: Hit) {
    onGo();
    if (/^https?:|\.pdf$/.test(h.href)) window.open(h.href, "_blank");
    else router.push(h.href);
  }

  let i = -1;
  return (
    <div>
      <input
        ref={input}
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, flat.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && flat[active]) {
            e.preventDefault();
            go(flat[active]);
          }
        }}
        placeholder="People, events, actions, pages…"
        className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-pink focus:ring-2 focus:ring-pink/30"
      />
      <div className="mt-3 max-h-[60vh] overflow-y-auto">
        {query.length < 2 ? (
          <p className="px-1 text-sm text-stone-500">
            Type a name, an event, an action or a page.
            <span className="hidden sm:inline">
              {" "}
              Tip: Ctrl + K (⌘ K on a Mac) opens this from anywhere.
            </span>
          </p>
        ) : groups.length === 0 ? (
          <p className="px-1 text-sm text-stone-500">
            {loading ? "Searching…" : `Nothing found for “${query}”.`}
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.title} className="mb-3">
              <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
                {g.title}
              </p>
              <ul>
                {g.hits.map((h) => {
                  i++;
                  const n = i;
                  return (
                    <li key={h.key}>
                      <button
                        type="button"
                        onClick={() => go(h)}
                        onMouseEnter={() => setActive(n)}
                        className={`flex w-full items-baseline justify-between gap-3 rounded-lg px-3 py-2 text-left ${
                          n === active ? "bg-pink/15" : "hover:bg-stone-100"
                        }`}
                      >
                        <span className="min-w-0 truncate font-medium text-navy">
                          {h.label}
                        </span>
                        {h.sub && (
                          <span className="shrink-0 truncate text-xs text-stone-500">
                            {h.sub}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
        {loading && groups.length > 0 && (
          <p className="px-1 text-xs text-stone-400">Searching…</p>
        )}
      </div>
    </div>
  );
}
