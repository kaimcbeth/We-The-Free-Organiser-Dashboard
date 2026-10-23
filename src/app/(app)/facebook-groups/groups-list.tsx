"use client";

import { useMemo, useState, useTransition } from "react";
import {
  removeFacebookGroup,
  saveFacebookGroup,
} from "@/app/facebook-group-actions";
import { Sheet } from "@/components/sheet";
import { groupNameFromLink } from "@/lib/group-name";
import { inputClass } from "@/components/form";

export type FbGroup = {
  id: string;
  teamId: string | null;
  name: string;
  url: string;
  category: string;
  members: number | null;
  notes: string;
};

const CATEGORIES: { value: string; label: string; tone: string }[] = [
  { value: "vegan", label: "Vegan", tone: "bg-[#22c55e]/15 text-[#15803d]" },
  {
    value: "animal_rights",
    label: "Animal rights",
    tone: "bg-pink/25 text-pink-ink",
  },
  { value: "local", label: "Local community", tone: "bg-cyan/20 text-navy" },
  { value: "other", label: "Other", tone: "bg-stone-100 text-stone-600" },
];
const catOf = (v: string) =>
  CATEGORIES.find((c) => c.value === v) ?? CATEGORIES[3];

const short = (name: string) =>
  name.replace(/, (Australia|New Zealand|Canada)$/, "");

// Facebook won't show group pages to apps (it asks them to log in), so the
// best guess is the link itself: /groups/vegans.of.sydney -> "Vegans Of Sydney".
// Number-only links (/groups/123456) give nothing.
const fmtMembers = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

export function GroupsList({
  groups,
  teams,
  defaultTeamId,
  isGod = false,
  add = null,
}: {
  isGod?: boolean;
  add?: { url: string; name: string } | null;
  groups: FbGroup[];
  teams: { id: string; name: string }[];
  defaultTeamId: string;
}) {
  // Organisers start on their own community; God Mode on everything.
  const [filter, setFilter] = useState<string>(isGod ? "all" : defaultTeamId);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<FbGroup | null>(
    add
      ? {
          id: "",
          teamId: defaultTeamId,
          name: add.name,
          url: add.url,
          category: "vegan",
          members: null,
          notes: "",
        }
      : null,
  );
  const teamName = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, short(t.name)])),
    [teams],
  );

  const shown = groups.filter(
    (g) =>
      (filter === "all" ||
        (filter === "none" ? !g.teamId : g.teamId === filter)) &&
      `${g.name} ${g.notes}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );

  // Grouped by community, communities in name order, unassigned last.
  const sections = useMemo(() => {
    const by = new Map<string, FbGroup[]>();
    for (const g of shown) {
      const k = g.teamId ?? "";
      by.set(k, [...(by.get(k) ?? []), g]);
    }
    return [...by.entries()].sort(([a], [b]) =>
      !a ? 1 : !b ? -1 : (teamName[a] ?? "").localeCompare(teamName[b] ?? ""),
    );
  }, [shown, teamName]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const g of groups)
      c[g.teamId ?? "none"] = (c[g.teamId ?? "none"] ?? 0) + 1;
    return c;
  }, [groups]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Community"
          className="rounded-xl bg-white px-3 py-2 text-sm font-medium ring-1 ring-stone-300"
        >
          <option value="all">All communities ({groups.length})</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {short(t.name)} ({counts[t.id] ?? 0})
            </option>
          ))}
          {isGod && (
            <option value="none">No community ({counts.none ?? 0})</option>
          )}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search groups"
          aria-label="Search groups"
          className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-stone-300"
        />
        <button
          onClick={() =>
            setEditing({
              id: "",
              teamId:
                filter !== "all" && filter !== "none" ? filter : defaultTeamId,
              name: "",
              url: "",
              category: "vegan",
              members: null,
              notes: "",
            })
          }
          className="rounded-xl bg-pink px-4 py-2 text-sm font-semibold text-navy hover:bg-pink-strong"
        >
          + Add group
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-stone-500 ring-1 ring-black/5">
          No groups yet. Add the first one.
        </p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-stone-500">No groups match.</p>
      ) : (
        sections.map(([teamId, list]) => (
          <section key={teamId || "none"}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
              {teamId ? teamName[teamId] : "No community"}{" "}
              <span className="font-normal normal-case">({list.length})</span>
            </h2>
            <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              {list.map((g) => (
                <GroupRow key={g.id} group={g} onEdit={() => setEditing(g)} />
              ))}
            </ul>
          </section>
        ))
      )}

      <AddFromFacebook />

      {editing && (
        <GroupSheet
          key={editing.id || "new"}
          group={editing}
          teams={teams}
          isGod={isGod}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function GroupRow({ group, onEdit }: { group: FbGroup; onEdit: () => void }) {
  const [pending, start] = useTransition();
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState("");
  const cat = catOf(group.category);
  if (removed) return null;
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={group.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-navy hover:underline"
          >
            {group.name} ↗
          </a>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cat.tone}`}
          >
            {cat.label}
          </span>
          {group.members != null && (
            <span className="text-xs text-stone-500">
              {fmtMembers(group.members)} members
            </span>
          )}
        </div>
        {group.notes && (
          <p className="mt-0.5 text-sm text-stone-600">{group.notes}</p>
        )}
        {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
      </div>
      <button
        onClick={onEdit}
        className="rounded-lg px-2 py-1 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-navy"
      >
        Edit
      </button>
      <button
        aria-label={`Remove ${group.name}`}
        title="Remove"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setRemoved(true);
            const r = await removeFacebookGroup(group.id);
            if (r.error) {
              setRemoved(false);
              setError(r.error);
            }
          })
        }
        className="flex h-7 w-7 items-center justify-center rounded-full text-stone-300 hover:bg-stone-100 hover:text-stone-600"
      >
        <svg
          viewBox="0 0 20 20"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden
        >
          <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  );
}

function GroupSheet({
  group,
  teams,
  isGod,
  onClose,
}: {
  group: FbGroup;
  teams: { id: string; name: string }[];
  isGod: boolean;
  onClose: () => void;
}) {
  // Guess the name from the link (lib/group-name), knowing our place names.
  const nameFromLink = (u: string) =>
    groupNameFromLink(
      u,
      teams.map((t) => t.name),
    );
  const [g, setG] = useState(group);
  const [members, setMembers] = useState(
    group.members != null ? String(group.members) : "",
  );
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const n = members.replace(/[^\d]/g, "");
      const r = await saveFacebookGroup({
        id: g.id || undefined,
        teamId: g.teamId,
        name: g.name,
        url: g.url,
        category: g.category,
        members: n ? Number(n) : null,
        notes: g.notes,
      });
      if (r.error) setError(r.error);
      else onClose();
    });
  }

  return (
    <Sheet
      title={g.id ? "Edit group" : "Add a Facebook group"}
      onClose={onClose}
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Link</span>
          <input
            autoFocus={!g.id}
            value={g.url}
            onChange={(e) => {
              const url = e.target.value;
              // Fill in the name from the link unless one's been typed.
              const guess = nameFromLink(url);
              setG({
                ...g,
                url,
                name:
                  guess && (!g.name || g.name === nameFromLink(g.url))
                    ? guess
                    : g.name,
              });
            }}
            placeholder="https://www.facebook.com/groups/…"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Name{" "}
            <span className="font-normal text-stone-500">
              (guessed from the link: check it matches Facebook)
            </span>
          </span>
          <input
            value={g.name}
            onChange={(e) => setG({ ...g, name: e.target.value })}
            placeholder="e.g. Vegans of Sydney"
            className={inputClass}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Community</span>
            <select
              value={g.teamId ?? ""}
              onChange={(e) => setG({ ...g, teamId: e.target.value || null })}
              className={inputClass}
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {short(t.name)}
                </option>
              ))}
              {isGod && <option value="">No community</option>}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Members</span>
            <input
              inputMode="numeric"
              value={members}
              onChange={(e) => setMembers(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </label>
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium">Type</span>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={g.category === c.value}
                onClick={() => setG({ ...g, category: c.value })}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold ring-1 ${
                  g.category === c.value
                    ? "bg-navy text-white ring-navy"
                    : "bg-white text-navy ring-stone-300"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Notes</span>
          <textarea
            value={g.notes}
            onChange={(e) => setG({ ...g, notes: e.target.value })}
            rows={2}
            placeholder="e.g. Event posts only on Fridays, admin approves posts"
            className={inputClass}
          />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button
          onClick={save}
          disabled={pending}
          className="w-full rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-2 disabled:opacity-60"
        >
          {pending ? "Saving…" : g.id ? "Save" : "Add group"}
        </button>
      </div>
    </Sheet>
  );
}

// A bookmark that, tapped on a Facebook group page, opens this page with the
// group's real name and link filled in (Facebook won't show group names to
// apps, but your own browser can see them).
function AddFromFacebook() {
  const target = "https://wtf-organiser.vercel.app/facebook-groups";
  const code = `(function(){var n=document.title.replace(/^\\(\\d+\\)\\s*/,'').replace(/\\s*\\|\\s*Facebook$/,'');var u=location.href.split('?')[0];window.open('${target}?add='+encodeURIComponent(u)+'&name='+encodeURIComponent(n),'_blank');})();`;
  const href = `javascript:${code}`;
  return (
    <section className="rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5">
      <h2 className="font-semibold">Add groups with their real names</h2>
      <p className="mt-1 text-stone-600">
        Drag this button to your bookmarks bar (on a computer). Then, on any
        Facebook group page, tap the bookmark and the group opens here with its
        name and link filled in.
      </p>
      <a
        // React blocks javascript: links in href, so set it directly.
        ref={(el) => {
          el?.setAttribute("href", href);
        }}
        onClick={(e) => e.preventDefault()}
        className="mt-3 inline-block cursor-grab rounded-xl bg-[#0866FF] px-3 py-1.5 font-semibold text-white"
      >
        + Add to Movement Hub
      </a>
    </section>
  );
}
