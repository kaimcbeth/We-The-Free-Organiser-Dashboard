"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/sheet";
import {
  PLAN_COLUMNS,
  PLAN_PLATFORMS,
  addDays,
  dayIn,
  isPlaceholder,
  planDayLabel,
  planImageUrls,
  uploadPlanImage,
  type PlanItem,
} from "@/lib/social-plan";

// Social media planner: a month calendar with the community's events and
// the posts planned for each day. A post can start as a quick note and get
// its caption, platforms and images later (or be saved straight from Write
// post / Get graphic in Actions). It never posts anything itself.

type PlanEvent = {
  id: string;
  title: string;
  starts_at: string;
  time_unknown: boolean | null;
  day: string;
};

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const platformLabel = (id: string) =>
  PLAN_PLATFORMS.find((p) => p.id === id)?.label ?? id;

export function SocialPlanner({ teamId, tz }: { teamId: string; tz: string }) {
  const [today] = useState(() => dayIn(Date.now(), tz));
  const [month, setMonth] = useState(today.slice(0, 7)); // yyyy-mm
  const [events, setEvents] = useState<PlanEvent[]>([]);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [reload, setReload] = useState(0);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Move a note or post to another day (drag and drop on the calendar).
  async function moveItem(id: string, day: string) {
    const item = items.find((p) => p.id === id);
    if (!item || item.day === day) return;
    setItems((list) => list.map((p) => (p.id === id ? { ...p, day } : p)));
    const { error } = await createClient()
      .from("social_plan")
      .update({ day, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) setReload((n) => n + 1);
  }

  // Grid: Monday on or before the 1st, to Sunday on or after the last day.
  const days = useMemo(() => {
    const first = `${month}-01`;
    const dow = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
    const start = addDays(first, -dow);
    const [y, m] = month.split("-").map(Number);
    const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    const ldow = (new Date(`${last}T12:00:00Z`).getUTCDay() + 6) % 7;
    const end = addDays(last, 6 - ldow);
    const out: string[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [month]);
  // Agenda: the next two weeks from today (or the month shown).
  const agendaFrom = month === today.slice(0, 7) ? today : `${month}-01`;
  const from = days[0] < agendaFrom ? days[0] : agendaFrom;
  const toDay = (() => {
    const a = addDays(agendaFrom, 14);
    const b = days[days.length - 1];
    return a > b ? a : b;
  })();

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: ev }, { data: plan }] = await Promise.all([
      supabase
        .from("events")
        .select("id, title, starts_at, time_unknown")
        .eq("team_id", teamId)
        .gte("starts_at", `${addDays(from, -1)}T00:00:00Z`)
        .lte("starts_at", `${addDays(toDay, 1)}T23:59:59Z`)
        .order("starts_at"),
      supabase
        .from("social_plan")
        .select(PLAN_COLUMNS)
        .eq("team_id", teamId)
        .gte("day", from)
        .lte("day", toDay)
        .order("created_at"),
    ]);
    const list = (plan as PlanItem[]) ?? [];
    setEvents(
      ((ev as Omit<PlanEvent, "day">[]) ?? []).map((e) => ({
        ...e,
        day: dayIn(e.starts_at, tz),
      })),
    );
    setItems(list);
    setUrls(await planImageUrls(list.flatMap((p) => p.image_paths)));
    setLoaded(true);
  }, [teamId, tz, from, toDay]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data
    load();
  }, [load, reload]);

  const byDay = (d: string) => ({
    ev: events.filter((e) => e.day === d),
    posts: items.filter((p) => p.day === d),
  });
  const shift = (n: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setMonth(d.toISOString().slice(0, 7));
  };
  const [y, m] = month.split("-").map(Number);
  const agenda: string[] = [];
  for (let d = agendaFrom; d < addDays(agendaFrom, 14); d = addDays(d, 1)) {
    const b = byDay(d);
    if (b.ev.length || b.posts.length) agenda.push(d);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-stone-500 hover:bg-stone-100"
          >
            ‹
          </button>
          <h2 className="min-w-36 text-center text-lg font-semibold">
            {MONTHS[m - 1]} {y}
          </h2>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-stone-500 hover:bg-stone-100"
          >
            ›
          </button>
        </div>
        {month !== today.slice(0, 7) && (
          <button
            type="button"
            onClick={() => setMonth(today.slice(0, 7))}
            className="text-sm text-stone-500 hover:text-navy hover:underline"
          >
            Today
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan" /> Event
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border border-dashed border-stone-500" />{" "}
          Idea
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-pink" /> Post ready
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-stone-300" /> Posted
        </span>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-px overflow-hidden rounded-2xl bg-stone-200 ring-1 ring-stone-200">
        {WEEK.map((w) => (
          <div
            key={w}
            className="bg-stone-50 py-1 text-center text-[11px] font-medium text-stone-500"
          >
            {w}
          </div>
        ))}
        {days.map((d) => {
          const { ev, posts } = byDay(d);
          const inMonth = d.startsWith(month);
          return (
            <div
              key={d}
              role="button"
              tabIndex={0}
              onClick={() => setOpen(d)}
              onKeyDown={(e) =>
                (e.key === "Enter" || e.key === " ") && setOpen(d)
              }
              // Drop a dragged note or post here to move it to this day.
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes("text/x-plan")) return;
                e.preventDefault();
                if (dragOver !== d) setDragOver(d);
              }}
              onDragLeave={() => dragOver === d && setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const id = e.dataTransfer.getData("text/x-plan");
                if (id) moveItem(id, d);
              }}
              className={`flex min-h-16 cursor-pointer flex-col items-stretch gap-0.5 p-1 text-left align-top hover:bg-cyan/5 sm:min-h-24 ${dragOver === d ? "!bg-cyan/15 ring-2 ring-inset ring-cyan" : inMonth ? "bg-white" : "bg-stone-50 text-stone-400"}`}
            >
              <span
                className={`self-start text-xs ${d === today ? "rounded-full bg-navy px-1.5 font-semibold text-white" : "px-0.5"}`}
              >
                {Number(d.slice(8))}
              </span>
              {/* Phones: dots. Bigger screens: short labels. */}
              <span className="flex flex-wrap gap-0.5 sm:hidden">
                {ev.map((e) => (
                  <span key={e.id} className="h-2 w-2 rounded-full bg-cyan" />
                ))}
                {posts.map((p) => (
                  <span
                    key={p.id}
                    className={`h-2 w-2 rounded-full ${p.posted_at ? "bg-stone-300" : isPlaceholder(p) ? "border border-dashed border-stone-500" : "bg-pink"}`}
                  />
                ))}
              </span>
              <span className="hidden flex-col gap-0.5 sm:flex">
                {ev.map((e) => (
                  <span
                    key={e.id}
                    className="truncate rounded bg-cyan/20 px-1 text-[11px] text-navy"
                  >
                    {e.title}
                  </span>
                ))}
                {posts.map((p) => (
                  <span
                    key={p.id}
                    draggable
                    title="Drag to another day to move it"
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.setData("text/x-plan", p.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className={`cursor-grab truncate rounded px-1 text-[11px] active:cursor-grabbing ${p.posted_at ? "bg-stone-100 text-stone-400 line-through" : isPlaceholder(p) ? "border border-dashed border-stone-400 text-stone-600" : "bg-pink/25 text-navy"}`}
                  >
                    {p.note || p.caption || "Image post"}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-stone-500">
        Tap a day to jot an idea, plan a post or see what&apos;s on. Drag an
        idea or post to another day to move it. You can also save posts and
        graphics here from Write post and Get graphic in Actions.
      </p>

      <h3 className="mt-6 text-sm font-semibold">
        Next two weeks
        {agendaFrom !== today && ` from ${planDayLabel(agendaFrom)}`}
      </h3>
      {loaded && agenda.length === 0 && (
        <p className="mt-1 text-sm text-stone-500">
          Nothing planned yet. Tap a day above to add a post idea.
        </p>
      )}
      <ul className="mt-2 space-y-2">
        {agenda.map((d) => {
          const { ev, posts } = byDay(d);
          return (
            <li key={d}>
              <button
                type="button"
                onClick={() => setOpen(d)}
                className="w-full rounded-xl bg-white p-3 text-left ring-1 ring-black/5 hover:ring-black/15"
              >
                <p className="text-xs font-semibold text-stone-500">
                  {planDayLabel(d)}
                  {d === today && " · today"}
                </p>
                {ev.map((e) => (
                  <p
                    key={e.id}
                    className="mt-1 flex items-center gap-1.5 text-sm"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full bg-cyan" />
                    <span className="truncate">{e.title}</span>
                  </p>
                ))}
                {posts.map((p) => (
                  <p
                    key={p.id}
                    className={`mt-1 flex items-center gap-1.5 text-sm ${p.posted_at ? "text-stone-400 line-through" : ""}`}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${p.posted_at ? "bg-stone-300" : isPlaceholder(p) ? "border border-dashed border-stone-500" : "bg-pink"}`}
                    />
                    <span className="truncate">
                      {p.note || p.caption || "Image post"}
                    </span>
                    {p.platforms.length > 0 && (
                      <span className="shrink-0 text-xs text-stone-400">
                        {p.platforms.map(platformLabel).join(", ")}
                      </span>
                    )}
                  </p>
                ))}
              </button>
            </li>
          );
        })}
      </ul>

      {open && (
        <DaySheet
          key={open}
          day={open}
          teamId={teamId}
          tz={tz}
          events={byDay(open).ev}
          posts={byDay(open).posts}
          urls={urls}
          onChanged={() => setReload((n) => n + 1)}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function DaySheet({
  day,
  teamId,
  tz,
  events,
  posts,
  urls,
  onChanged,
  onClose,
}: {
  day: string;
  teamId: string;
  tz: string;
  events: PlanEvent[];
  posts: PlanItem[];
  urls: Record<string, string>;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  async function addNote() {
    if (!note.trim()) return;
    setBusy(true);
    setError("");
    const { error } = await createClient()
      .from("social_plan")
      .insert({ team_id: teamId, day, note: note.trim() });
    setBusy(false);
    if (error) return setError("Couldn't add that. Try again?");
    setNote("");
    onChanged();
  }

  return (
    <Sheet title={planDayLabel(day)} onClose={onClose}>
      {events.length > 0 && (
        <div className="mb-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Events
          </p>
          {events.map((e) => (
            <p key={e.id} className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 shrink-0 rounded-full bg-cyan" />
              <span className="min-w-0 flex-1 truncate">{e.title}</span>
              {!e.time_unknown && (
                <span className="shrink-0 text-xs text-stone-500">
                  {new Date(e.starts_at).toLocaleTimeString("en-AU", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: tz,
                  })}
                </span>
              )}
            </p>
          ))}
        </div>
      )}

      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        Posts
      </p>
      <div className="mt-1 flex gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addNote()}
          placeholder={
            events[0]
              ? `e.g. Countdown to ${events[0].title}`
              : "Quick idea, e.g. throwback from the potluck"
          }
          className="min-w-0 flex-1 rounded-lg bg-white px-2.5 py-1.5 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
        />
        <button
          type="button"
          onClick={addNote}
          disabled={busy || !note.trim()}
          className="rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}

      <ul className="mt-3 space-y-2">
        {posts.map((p) => (
          <PostEditor
            key={p.id}
            item={p}
            teamId={teamId}
            urls={urls}
            onChanged={onChanged}
          />
        ))}
        {adding && (
          <PostEditor
            teamId={teamId}
            day={day}
            urls={urls}
            onChanged={() => {
              setAdding(false);
              onChanged();
            }}
            onCancel={() => setAdding(false)}
          />
        )}
      </ul>
      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 text-sm font-medium text-pink-ink hover:underline"
        >
          Plan a full post
        </button>
      )}
      {posts.length === 0 && !adding && (
        <p className="mt-2 text-xs text-stone-500">
          Start with a quick idea and fill in the post later, or plan the whole
          post now.
        </p>
      )}
    </Sheet>
  );
}

type Img = { path?: string; file?: File; url: string };

function PostEditor({
  item,
  teamId,
  day,
  urls,
  onChanged,
  onCancel,
}: {
  item?: PlanItem;
  teamId: string;
  day?: string;
  urls: Record<string, string>;
  onChanged: () => void;
  onCancel?: () => void;
}) {
  const [editing, setEditing] = useState(!item);
  const [note, setNote] = useState(item?.note ?? "");
  const [caption, setCaption] = useState(item?.caption ?? "");
  const [platforms, setPlatforms] = useState<string[]>(item?.platforms ?? []);
  const [when, setWhen] = useState(item?.day ?? day ?? "");
  const [imgs, setImgs] = useState<Img[]>(
    (item?.image_paths ?? []).map((p) => ({ path: p, url: urls[p] ?? "" })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moving, setMoving] = useState(false);
  const placeholder = item ? isPlaceholder(item) : true;

  async function save() {
    if (!note.trim() && !caption.trim() && imgs.length === 0)
      return setError("Add a note, a caption or an image.");
    setBusy(true);
    setError("");
    try {
      const paths: string[] = [];
      for (const i of imgs)
        paths.push(i.path ?? (await uploadPlanImage(teamId, i.file!)));
      const row = {
        team_id: teamId,
        day: when,
        note: note.trim() || null,
        caption: caption.trim() || null,
        platforms,
        image_paths: paths,
        updated_at: new Date().toISOString(),
      };
      const supabase = createClient();
      const { error } = item
        ? await supabase.from("social_plan").update(row).eq("id", item.id)
        : await supabase.from("social_plan").insert(row);
      if (error) throw error;
      const gone = (item?.image_paths ?? []).filter((p) => !paths.includes(p));
      if (gone.length) await supabase.storage.from("social-plan").remove(gone);
      setEditing(false);
      onChanged();
    } catch {
      setError("Couldn't save that. Try again?");
    }
    setBusy(false);
  }

  async function setPosted(on: boolean) {
    if (!item) return;
    await createClient()
      .from("social_plan")
      .update({ posted_at: on ? new Date().toISOString() : null })
      .eq("id", item.id);
    onChanged();
  }

  async function move() {
    if (!item || !when) return;
    await createClient()
      .from("social_plan")
      .update({ day: when, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    setMoving(false);
    onChanged();
  }

  async function remove() {
    if (!item) return;
    const supabase = createClient();
    await supabase.from("social_plan").delete().eq("id", item.id);
    if (item.image_paths.length)
      await supabase.storage.from("social-plan").remove(item.image_paths);
    onChanged();
  }

  async function share() {
    const files: File[] = [];
    for (const [n, i] of imgs.entries()) {
      if (i.file) files.push(i.file);
      else if (i.url) {
        const b = await fetch(i.url).then((r) => r.blob());
        files.push(
          new File(
            [b],
            `post-${n + 1}.${b.type === "image/jpeg" ? "jpg" : "png"}`,
            {
              type: b.type,
            },
          ),
        );
      }
    }
    if (caption) await navigator.clipboard.writeText(caption).catch(() => {});
    const data: ShareData = { text: caption || undefined };
    if (files.length && navigator.canShare?.({ files })) data.files = files;
    await navigator.share(data).catch(() => {});
  }

  if (!editing && item)
    return (
      <li
        className={`rounded-xl p-3 ring-1 ${item.posted_at ? "bg-stone-50 ring-black/5" : placeholder ? "border border-dashed border-stone-300 bg-white ring-transparent" : "bg-white ring-pink/40"}`}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {item.note && (
              <p
                className={`text-sm font-medium ${item.posted_at ? "text-stone-400 line-through" : ""}`}
              >
                {item.note}
              </p>
            )}
            {item.caption && (
              <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-sm text-stone-600">
                {item.caption}
              </p>
            )}
            <p className="mt-1 text-xs text-stone-500">
              {item.posted_at
                ? "Posted"
                : placeholder
                  ? "Idea"
                  : "Ready to post"}
              {item.platforms.length > 0 &&
                ` · ${item.platforms.map(platformLabel).join(", ")}`}
            </p>
          </div>
          {imgs[0]?.url && (
            // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
            <img
              src={imgs[0].url}
              alt=""
              className="h-14 w-14 shrink-0 rounded-lg object-cover"
            />
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-semibold text-navy hover:underline"
          >
            {placeholder ? "Fill in the post" : "Edit"}
          </button>
          {item.caption && (
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(item.caption!);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="text-stone-500 hover:text-navy"
            >
              {copied ? "Copied" : "Copy caption"}
            </button>
          )}
          {!placeholder &&
            typeof navigator !== "undefined" &&
            "share" in navigator && (
              <button
                type="button"
                onClick={share}
                className="text-stone-500 hover:text-navy"
              >
                Share
              </button>
            )}
          <button
            type="button"
            onClick={() => setPosted(!item.posted_at)}
            className="text-stone-500 hover:text-navy"
          >
            {item.posted_at ? "Not posted yet" : "Mark as posted"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMoving(!moving);
              setConfirmDelete(false);
            }}
            className="text-stone-500 hover:text-navy"
          >
            Move
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmDelete(!confirmDelete);
              setMoving(false);
            }}
            className="text-stone-400 hover:text-red-700"
          >
            Delete
          </button>
        </div>
        {moving && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-stone-600">Move to</span>
            <input
              type="date"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="rounded-lg bg-white px-2 py-1 text-sm ring-1 ring-black/10"
            />
            <button
              type="button"
              onClick={move}
              disabled={!when || when === item.day}
              className="rounded-lg bg-navy px-2.5 py-1 font-semibold text-white disabled:opacity-50"
            >
              Move
            </button>
            {[1, 7].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setWhen(addDays(item.day, n))}
                className="text-stone-500 hover:text-navy hover:underline"
              >
                {n === 1 ? "Next day" : "Next week"}
              </button>
            ))}
          </div>
        )}
        {confirmDelete && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-stone-600">Delete this?</span>
            <button
              type="button"
              onClick={remove}
              className="font-semibold text-red-700 hover:underline"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-stone-500 hover:underline"
            >
              Cancel
            </button>
          </div>
        )}
      </li>
    );

  return (
    <li className="rounded-xl bg-white p-3 ring-1 ring-black/10">
      <label className="block text-xs font-medium text-stone-600">
        Idea
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What's this post about?"
          className="mt-1 block w-full rounded-lg bg-white px-2.5 py-1.5 text-sm font-normal ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
        />
      </label>
      <label className="mt-2 block text-xs font-medium text-stone-600">
        Caption
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={Math.min(12, Math.max(3, caption.split("\n").length + 1))}
          placeholder="Paste or write the post"
          className="mt-1 block w-full resize-y rounded-lg bg-white px-2.5 py-1.5 text-sm font-normal ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan"
        />
      </label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PLAN_PLATFORMS.map((p) => {
          const on = platforms.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() =>
                setPlatforms(
                  on
                    ? platforms.filter((x) => x !== p.id)
                    : [...platforms, p.id],
                )
              }
              className={`rounded-full px-3 py-0.5 text-xs font-medium ring-1 ${on ? "bg-navy text-white ring-navy" : "bg-white text-stone-600 ring-stone-300"}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {imgs.map((i, n) => (
          <span key={i.path ?? i.url} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed or local URL */}
            <img
              src={i.url}
              alt=""
              className="h-16 w-16 rounded-lg object-cover ring-1 ring-black/10"
            />
            <button
              type="button"
              aria-label="Remove image"
              onClick={() => setImgs(imgs.filter((_, k) => k !== n))}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-navy text-xs text-white"
            >
              ×
            </button>
          </span>
        ))}
        <label className="cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50">
          Add images
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              setImgs([
                ...imgs,
                ...files.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
              ]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs font-medium text-stone-600">
        Day
        <input
          type="date"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="rounded-lg bg-white px-2 py-1 text-sm font-normal ring-1 ring-black/10"
        />
      </label>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <div className="mt-3 flex items-center justify-between gap-2">
        {item ? (
          confirmDelete ? (
            <span className="flex items-center gap-2 text-xs">
              Delete this post?
              <button
                type="button"
                onClick={remove}
                className="font-semibold text-red-700 hover:underline"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-stone-500 hover:underline"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-stone-400 hover:text-red-700 hover:underline"
            >
              Delete
            </button>
          )
        ) : (
          <span />
        )}
        <span className="flex gap-2">
          <button
            type="button"
            onClick={() => (item ? setEditing(false) : onCancel?.())}
            className="rounded-lg px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </span>
      </div>
    </li>
  );
}
