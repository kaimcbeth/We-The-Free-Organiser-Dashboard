"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/sheet";
import { loadPosterFonts } from "@/components/graphic-poster";
import { drawHangoutSlide, loadMark } from "@/components/hangout-slide";
import { HangoutPresent } from "@/components/hangout-present";
import {
  downloadPdf,
  downloadPptx,
  notesText,
} from "@/components/hangout-export";
import {
  BLOCK_COLUMNS,
  PLAN_COLUMNS,
  loadBlocks,
  loadPlans,
  loadSuggestions,
  makeFill,
  regionLabel,
} from "@/lib/hangout-data";
import {
  HOUR,
  LAYOUTS,
  SECTIONS,
  announcementIdeas,
  buildDeck,
  fmtDay,
  itemSlides,
  lastUsed,
  planMinutes,
  sectionOf,
  starterItems,
  uid,
  usedLabel,
  type Block,
  type DeckSlide,
  type Layout,
  type Plan,
  type PlanItem,
  type Section,
  type SlideData,
  type Suggestions,
} from "@/lib/hangouts";

type HangoutRow = { id: string; title: string; starts_at: string; url: string };

const pinkBtn =
  "rounded-xl bg-pink px-3 py-1.5 text-sm font-semibold text-navy hover:bg-pink-strong disabled:opacity-50";
const quietBtn =
  "rounded-xl bg-navy/5 px-3 py-1.5 text-sm font-semibold text-navy hover:bg-navy/10 disabled:opacity-50";
const input =
  "w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-cyan";

export function HangoutBuilder({
  regionId,
  regions,
  startHangoutId,
  isGod,
}: {
  regionId: string;
  regions: { id: string; label: string }[] | null; // God: switch region
  startHangoutId: string | null;
  isGod: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [region, setRegion] = useState(regionId);
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [hangouts, setHangouts] = useState<HangoutRow[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [regionName, setRegionName] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [saved, setSaved] = useState<"saved" | "saving" | "error">("saved");
  const [mark, setMark] = useState<HTMLImageElement | null>(null);
  const [fonts, setFonts] = useState(0);
  const [tab, setTab] = useState<Section>("icebreaker");
  const [editing, setEditing] = useState<
    | { mode: "block"; block: Block | null; section: Section }
    | { mode: "item"; item: PlanItem }
    | null
  >(null);
  const [presenting, setPresenting] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const dirty = useRef(false);
  const dragUid = useRef<string | null>(null);
  const started = useRef<string | null>(null);

  useEffect(() => {
    let live = true;
    loadMark().then((m) => live && setMark(m));
    loadPosterFonts()?.then(() => live && setFonts((n) => n + 1));
    return () => {
      live = false;
    };
  }, []);

  const loadAll = useCallback(async () => {
    const [b, p, s, name, h] = await Promise.all([
      loadBlocks(supabase, region),
      loadPlans(supabase, region),
      loadSuggestions(supabase, region),
      regionLabel(supabase, region),
      supabase.rpc("region_hangouts", { p_region: region }),
    ]);
    return { b, p, s, name, h: (h.data as HangoutRow[] | null) ?? [] };
  }, [supabase, region]);

  useEffect(() => {
    let live = true;
    loadAll().then(async ({ b, p, s, name, h }) => {
      if (!live) return;
      setBlocks(b);
      setPlans(p);
      setSuggestions(s);
      setRegionName(name);
      setHangouts(h);
      // Opened from a hangout (action card or listing): its plan, or a new one.
      if (startHangoutId && started.current !== startHangoutId) {
        started.current = startHangoutId;
        const found = p.find((x) => x.hangout_id === startHangoutId);
        if (found) return setPlan(found);
        const hang = h.find((x) => x.id === startHangoutId);
        if (hang) {
          const made = await createPlan(b, {
            hangout_id: hang.id,
            title: hang.title,
            held_on: hang.starts_at.slice(0, 10),
          });
          if (live && made) {
            setPlans((list) => [made, ...list]);
            setPlan(made);
          }
          return;
        }
      }
      const today = new Date().toISOString().slice(0, 10);
      const upcoming = [...p]
        .filter((x) => !x.held_on || x.held_on >= today)
        .sort((a, c) => (a.held_on ?? "9").localeCompare(c.held_on ?? "9"));
      setPlan(upcoming[0] ?? p[0] ?? null);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAll, startHangoutId]);

  async function createPlan(
    b: Block[],
    extra: Partial<Pick<Plan, "hangout_id" | "title" | "held_on">> = {},
  ) {
    const next = hangouts.find(
      (h) =>
        h.starts_at > new Date().toISOString() &&
        !plans.some((p) => p.hangout_id === h.id),
    );
    const row = {
      region_id: region,
      title: extra.title ?? next?.title ?? "Organiser hangout",
      held_on: extra.held_on ?? next?.starts_at.slice(0, 10) ?? null,
      hangout_id: extra.hangout_id ?? next?.id ?? null,
      items: starterItems(b),
    };
    const { data, error } = await supabase
      .from("hangout_plans")
      .insert(row)
      .select(PLAN_COLUMNS)
      .single();
    if (error) {
      setNote("Couldn't start a new hangout. Try again in a moment.");
      return null;
    }
    return data as Plan;
  }

  // Save a moment after each change.
  useEffect(() => {
    if (!plan || !dirty.current) return;
    const t = setTimeout(async () => {
      dirty.current = false;
      setSaved("saving");
      const { error } = await supabase
        .from("hangout_plans")
        .update({
          title: plan.title,
          held_on: plan.held_on,
          hangout_id: plan.hangout_id,
          items: plan.items,
          updated_at: new Date().toISOString(),
        })
        .eq("id", plan.id);
      setSaved(error ? "error" : "saved");
      if (!error)
        setPlans((list) =>
          list.map((p) => (p.id === plan.id ? { ...plan } : p)),
        );
    }, 700);
    return () => clearTimeout(t);
  }, [plan, supabase]);

  function change(fn: (p: Plan) => Plan) {
    dirty.current = true;
    setSaved("saving");
    setPlan((p) => (p ? fn(p) : p));
  }
  const setItems = (fn: (items: PlanItem[]) => PlanItem[]) =>
    change((p) => ({ ...p, items: fn(p.items) }));

  const byId = useMemo(
    () => new Map((blocks ?? []).map((b) => [b.id, b])),
    [blocks],
  );
  const used = useMemo(
    () => lastUsed(plans, plan?.id ?? null),
    [plans, plan?.id],
  );
  const fill = useMemo(
    () => makeFill(regionName, plan, suggestions),
    [regionName, plan, suggestions],
  );
  const deck = useMemo(
    () => (plan ? buildDeck(plan, byId, fill) : []),
    [plan, byId, fill],
  );
  const total = plan ? planMinutes(plan.items) : 0;
  const ideas = announcementIdeas(suggestions, plan?.held_on ?? null);

  function addBlock(b: Block) {
    // Wrap-up and announcements go to the end; everything else goes before
    // the announcements (Kai: announcements at the end).
    setItems((items) => {
      const item = { uid: uid(), block: b.id, minutes: b.minutes };
      if (b.section === "closing" || b.section === "announcements")
        return [...items, item];
      const tail = items.findIndex((i) => {
        const s = byId.get(i.block)?.section;
        return s === "announcements" || s === "closing";
      });
      if (tail < 0) return [...items, item];
      return [...items.slice(0, tail), item, ...items.slice(tail)];
    });
    setNote(`Added ${b.title}.`);
  }

  function move(uidKey: string, by: number) {
    setItems((items) => {
      const i = items.findIndex((x) => x.uid === uidKey);
      const j = i + by;
      if (i < 0 || j < 0 || j >= items.length) return items;
      const copy = [...items];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }
  function dropOn(target: string) {
    const from = dragUid.current;
    dragUid.current = null;
    if (!from || from === target) return;
    setItems((items) => {
      const moving = items.find((x) => x.uid === from);
      if (!moving) return items;
      const rest = items.filter((x) => x.uid !== from);
      const at = rest.findIndex((x) => x.uid === target);
      rest.splice(at < 0 ? rest.length : at, 0, moving);
      return rest;
    });
  }

  function addIdea(item: PlanItem, text: string) {
    setItems((items) =>
      items.map((i) => {
        if (i.uid !== item.uid) return i;
        const slides = itemSlides(i, byId).map((s) => ({ ...s }));
        let target = slides.find((s) => s.layout === "points");
        if (!target) {
          target = { layout: "points", heading: "Announcements", points: [] };
          slides.push(target);
        }
        const pts = target.points ?? [];
        if (!pts.includes(text)) target.points = [...pts, text];
        return { ...i, slides };
      }),
    );
  }

  async function newPlan() {
    if (!blocks) return;
    const made = await createPlan(blocks);
    if (made) {
      setPlans((list) => [made, ...list]);
      setPlan(made);
      setNote("New hangout started with the welcome and announcements.");
    }
  }

  async function deletePlan() {
    if (!plan) return;
    if (!confirm(`Delete "${plan.title}"? This can't be undone.`)) return;
    const { error } = await supabase
      .from("hangout_plans")
      .delete()
      .eq("id", plan.id);
    if (error) return setNote("Couldn't delete it.");
    const rest = plans.filter((p) => p.id !== plan.id);
    setPlans(rest);
    setPlan(rest[0] ?? null);
  }

  async function saveBlock(b: Partial<Block> & { id?: string }) {
    const row = {
      section: b.section,
      title: b.title,
      blurb: b.blurb || null,
      minutes: b.minutes,
      slides: b.slides,
      updated_at: new Date().toISOString(),
    };
    const q = b.id
      ? supabase.from("hangout_blocks").update(row).eq("id", b.id)
      : supabase
          .from("hangout_blocks")
          .insert({ ...row, region_id: region, sort_order: 1000 });
    const { data, error } = await q.select(BLOCK_COLUMNS).single();
    if (error) {
      setNote("Couldn't save the block. Try again in a moment.");
      return false;
    }
    const saved = data as Block;
    setBlocks((list) => {
      const l = list ?? [];
      return l.some((x) => x.id === saved.id)
        ? l.map((x) => (x.id === saved.id ? saved : x))
        : [...l, saved];
    });
    return true;
  }

  async function archiveBlock(b: Block) {
    if (!confirm(`Remove "${b.title}" from the library?`)) return;
    const { error } = await supabase
      .from("hangout_blocks")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", b.id);
    if (error) return setNote("Couldn't remove it.");
    setBlocks((list) => (list ?? []).filter((x) => x.id !== b.id));
    setEditing(null);
  }

  async function exportAs(kind: "pptx" | "pdf") {
    if (!plan || !deck.length) return;
    setBusy(kind);
    try {
      const o = {
        region: regionName,
        mark,
        title: plan.title,
        heldOn: plan.held_on,
      };
      if (kind === "pptx") await downloadPptx(deck, o);
      else await downloadPdf(deck, o);
    } catch {
      setNote("Couldn't make the file. Try again in a moment.");
    }
    setBusy("");
  }

  async function copyNotesLink() {
    if (!plan) return;
    const url = `${location.origin}/hangout-notes/${plan.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setNote("Copied the notes link. Open it on your phone.");
    } catch {
      setNote(url);
    }
  }
  async function copyNotes() {
    try {
      await navigator.clipboard.writeText(notesText(deck));
      setNote("Copied the speaker notes.");
    } catch {
      setNote("Couldn't copy here.");
    }
  }

  const canEditBlock = (b: Block) => (b.region_id ? true : isGod);

  if (!blocks) return <p className="mt-6 text-sm text-stone-500">Loading…</p>;

  const library = blocks
    .filter((b) => b.section === tab)
    .map((b) => ({ b, when: used.get(b.id) ?? null }))
    .sort((x, y) => {
      if (!!x.when !== !!y.when) return x.when ? 1 : -1;
      if (x.when && y.when && x.when !== y.when)
        return x.when.localeCompare(y.when);
      return x.b.sort_order - y.b.sort_order;
    });
  const inPlan = new Set(plan?.items.map((i) => i.block));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Organiser hangouts
      </h1>
      <p className="mt-1 text-sm text-stone-600">
        Put this month&apos;s hangout together from ready-made blocks, then
        present it here or download the slides with speaker notes.
      </p>

      {regions && (
        <label className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-stone-600">Region</span>
          <select
            value={region}
            onChange={(e) => {
              setBlocks(null);
              setPlan(null);
              setRegion(e.target.value);
            }}
            className="rounded-xl bg-white px-2 py-1.5 ring-1 ring-black/10"
          >
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Which hangout */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {plans.length > 0 && (
          <select
            value={plan?.id ?? ""}
            onChange={(e) =>
              setPlan(plans.find((p) => p.id === e.target.value) ?? null)
            }
            aria-label="Your hangouts"
            className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-black/10"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.held_on ? `${fmtDay(p.held_on)} · ` : ""}
                {p.title}
              </option>
            ))}
          </select>
        )}
        <button type="button" onClick={newPlan} className={pinkBtn}>
          + New hangout
        </button>
      </div>

      {!plan ? (
        <div className="mt-4 rounded-2xl bg-white p-5 text-sm text-stone-600 shadow-sm ring-1 ring-black/5">
          No hangouts planned yet. Start one with{" "}
          <span className="font-semibold text-navy">+ New hangout</span>: it
          begins with a welcome and announcements, and you add icebreakers and
          exercises from the library below.
        </div>
      ) : (
        <>
          <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={plan.title}
                onChange={(e) =>
                  change((p) => ({ ...p, title: e.target.value }))
                }
                aria-label="Title"
                className={`${input} font-semibold`}
              />
              <input
                type="date"
                value={plan.held_on ?? ""}
                onChange={(e) =>
                  change((p) => ({ ...p, held_on: e.target.value || null }))
                }
                aria-label="Date"
                className={input}
              />
            </div>
            {hangouts.length > 0 && (
              <label className="mt-2 flex items-center gap-2 text-sm">
                <span className="shrink-0 text-stone-500">For</span>
                <select
                  value={plan.hangout_id ?? ""}
                  onChange={(e) => {
                    const h = hangouts.find((x) => x.id === e.target.value);
                    change((p) => ({
                      ...p,
                      hangout_id: h?.id ?? null,
                      held_on: h ? h.starts_at.slice(0, 10) : p.held_on,
                    }));
                  }}
                  className="min-w-0 flex-1 rounded-xl bg-white px-2 py-1.5 ring-1 ring-black/10"
                >
                  <option value="">Not linked to a hangout listing</option>
                  {hangouts.map((h) => (
                    <option key={h.id} value={h.id}>
                      {fmtDay(h.starts_at)} · {h.title}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <TimeBar items={plan.items} byId={byId} total={total} />

            {/* The plan */}
            <ol className="mt-3 space-y-2">
              {plan.items.map((item, i) => {
                const b = byId.get(item.block);
                if (!b) return null;
                const sec = sectionOf(b.section);
                const when = used.get(b.id);
                return (
                  <li
                    key={item.uid}
                    draggable
                    onDragStart={(e) => {
                      dragUid.current = item.uid;
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      dropOn(item.uid);
                    }}
                    className="rounded-xl bg-stone-50 p-2.5 ring-1 ring-black/5"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="cursor-grab select-none text-stone-300"
                        title="Drag to move"
                      >
                        ⠿
                      </span>
                      <span
                        className="h-8 w-1.5 shrink-0 rounded-full"
                        style={{ background: sec.colour }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-navy">
                          {b.title}
                        </p>
                        <p className="truncate text-xs text-stone-500">
                          {sec.label.replace(/s$/, "")}
                          {item.slides ? " · changed for this hangout" : ""}
                          {when
                            ? ` · ${usedLabel(when).replace("Used", "used")}`
                            : ""}
                        </p>
                      </div>
                      <label className="flex shrink-0 items-center gap-1 text-xs text-stone-500">
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={item.minutes}
                          onChange={(e) => {
                            const m = Math.max(
                              1,
                              Math.min(60, Number(e.target.value) || 1),
                            );
                            setItems((items) =>
                              items.map((x) =>
                                x.uid === item.uid ? { ...x, minutes: m } : x,
                              ),
                            );
                          }}
                          aria-label={`Minutes for ${b.title}`}
                          className="w-12 rounded-lg bg-white px-1.5 py-1 text-right text-sm text-navy ring-1 ring-black/10"
                        />
                        min
                      </label>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-xs">
                      <button
                        type="button"
                        onClick={() => setEditing({ mode: "item", item })}
                        className="font-medium text-pink-ink hover:underline"
                      >
                        Edit slides
                      </button>
                      <button
                        type="button"
                        onClick={() => move(item.uid, -1)}
                        disabled={i === 0}
                        className="text-stone-500 hover:text-navy disabled:opacity-30"
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(item.uid, 1)}
                        disabled={i === plan.items.length - 1}
                        className="text-stone-500 hover:text-navy disabled:opacity-30"
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setItems((items) =>
                            items.filter((x) => x.uid !== item.uid),
                          )
                        }
                        className="ml-auto text-stone-400 hover:text-navy"
                      >
                        Remove
                      </button>
                    </div>
                    {b.section === "announcements" &&
                      b.key === "announcements" && (
                        <AnnouncementIdeas
                          ideas={ideas}
                          have={
                            itemSlides(item, byId).find(
                              (s) => s.layout === "points",
                            )?.points ?? []
                          }
                          onAdd={(t) => addIdea(item, t)}
                        />
                      )}
                  </li>
                );
              })}
            </ol>
            {plan.items.length === 0 && (
              <p className="mt-3 text-sm text-stone-500">
                Nothing in this hangout yet. Add blocks from the library below.
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPresenting(0)}
                disabled={!deck.length}
                className={pinkBtn}
              >
                Present
              </button>
              <button
                type="button"
                onClick={() => exportAs("pptx")}
                disabled={!deck.length || !!busy}
                className={quietBtn}
              >
                {busy === "pptx" ? "Making…" : "PowerPoint"}
              </button>
              <button
                type="button"
                onClick={() => exportAs("pdf")}
                disabled={!deck.length || !!busy}
                className={quietBtn}
              >
                {busy === "pdf" ? "Making…" : "PDF"}
              </button>
              <span className="ml-auto text-xs text-stone-400">
                {saved === "saving"
                  ? "Saving…"
                  : saved === "error"
                    ? "Not saved"
                    : "Saved"}
              </span>
            </div>
            <p className="mt-2 text-xs text-stone-500">
              The PowerPoint has the speaker notes and opens in PowerPoint,
              Keynote or Google Slides. Presenting here?{" "}
              <button
                type="button"
                onClick={copyNotesLink}
                className="font-medium text-pink-ink hover:underline"
              >
                Copy the notes link
              </button>{" "}
              for your phone, or press N while presenting for a notes window.{" "}
              <button
                type="button"
                onClick={copyNotes}
                className="font-medium text-pink-ink hover:underline"
              >
                Copy all notes
              </button>
            </p>
            {note && <p className="mt-2 text-sm text-stone-600">{note}</p>}
          </section>

          {deck.length > 0 && (
            <section className="mt-4">
              <h2 className="text-sm font-semibold text-navy">
                The slides ({deck.length})
              </h2>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {deck.map((s, i) => (
                  <button
                    key={`${s.itemUid}-${i}`}
                    type="button"
                    onClick={() => setPresenting(i)}
                    className="overflow-hidden rounded-lg ring-1 ring-black/10 hover:ring-2 hover:ring-pink"
                    title="Present from here"
                  >
                    <SlideThumb
                      slide={s}
                      index={i}
                      total={deck.length}
                      region={regionName}
                      mark={mark}
                      tick={fonts}
                    />
                  </button>
                ))}
              </div>
            </section>
          )}

          <button
            type="button"
            onClick={deletePlan}
            className="mt-3 text-xs text-stone-400 hover:text-navy"
          >
            Delete this hangout
          </button>
        </>
      )}

      {/* Library */}
      <section className="mt-6">
        <h2 className="font-semibold text-navy">Library</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setTab(s.key)}
              className={`rounded-full px-3 py-1 text-sm font-semibold ${tab === s.key ? "bg-navy text-white" : "bg-navy/5 text-navy hover:bg-navy/10"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <ul className="mt-3 space-y-2">
          {library.map(({ b, when }) => (
            <li
              key={b.id}
              className={`rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5 ${when ? "opacity-80" : ""}`}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-navy">
                    {b.title}
                    <span className="text-xs font-normal text-stone-500">
                      {b.minutes} min
                    </span>
                    {b.region_id && (
                      <span className="rounded-full bg-cyan/25 px-2 py-0.5 text-[11px] font-semibold">
                        Yours
                      </span>
                    )}
                    {when && (
                      <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
                        {usedLabel(when)}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-stone-600">
                    {b.blurb ||
                      (b.slides[0]?.heading !== b.title
                        ? b.slides[0]?.heading
                        : "")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addBlock(b)}
                  disabled={!plan}
                  className={`shrink-0 ${inPlan.has(b.id) ? quietBtn : pinkBtn}`}
                >
                  {inPlan.has(b.id) ? "Add again" : "Add"}
                </button>
              </div>
              <button
                type="button"
                onClick={() =>
                  setEditing({ mode: "block", block: b, section: b.section })
                }
                className="mt-1 text-xs font-medium text-pink-ink hover:underline"
              >
                {canEditBlock(b) ? "See and edit" : "See the slides"}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() =>
            setEditing({ mode: "block", block: null, section: tab })
          }
          className={`mt-3 ${quietBtn}`}
        >
          + Write your own
        </button>
        <p className="mt-2 text-xs text-stone-500">
          Blocks used in your region&apos;s other hangouts are marked and listed
          last, so the icebreakers and exercises stay fresh.
          {isGod
            ? " You can edit the shared library; blocks you write here are for this region only."
            : " Blocks you write are for your region."}
        </p>
      </section>

      {editing && (
        <BlockEditor
          key={
            editing.mode === "item"
              ? editing.item.uid
              : (editing.block?.id ?? "new")
          }
          editing={editing}
          byId={byId}
          canEdit={
            editing.mode === "item" ||
            !editing.block ||
            canEditBlock(editing.block)
          }
          region={regionName}
          mark={mark}
          tick={fonts}
          fill={fill}
          onClose={() => setEditing(null)}
          onSaveBlock={async (b) => {
            if (await saveBlock(b)) setEditing(null);
          }}
          onArchive={archiveBlock}
          onSaveItem={(slides) => {
            if (editing.mode !== "item") return;
            const target = editing.item.uid;
            setItems((items) =>
              items.map((x) => (x.uid === target ? { ...x, slides } : x)),
            );
            setEditing(null);
          }}
        />
      )}

      {presenting !== null && plan && (
        <HangoutPresent
          deck={deck}
          region={regionName}
          mark={mark}
          start={presenting}
          planId={plan.id}
          onClose={() => setPresenting(null)}
        />
      )}
    </div>
  );
}

function TimeBar({
  items,
  byId,
  total,
}: {
  items: PlanItem[];
  byId: Map<string, Block>;
  total: number;
}) {
  const scale = Math.max(HOUR, total);
  const over = total - HOUR;
  return (
    <div className="mt-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-stone-100">
        {items.map((i) => {
          const b = byId.get(i.block);
          if (!b) return null;
          return (
            <span
              key={i.uid}
              title={`${b.title} · ${i.minutes} min`}
              style={{
                width: `${(i.minutes / scale) * 100}%`,
                background: sectionOf(b.section).colour,
              }}
              className="border-r-2 border-white last:border-r-0"
            />
          );
        })}
      </div>
      <p
        className={`mt-1 text-sm font-semibold ${over > 0 ? "text-pink-ink" : "text-navy"}`}
      >
        {over > 0
          ? `${total} minutes: ${over} over the hour`
          : `${total} of ${HOUR} minutes${total < HOUR ? ` · ${HOUR - total} to spare` : ""}`}
      </p>
    </div>
  );
}

function AnnouncementIdeas({
  ideas,
  have,
  onAdd,
}: {
  ideas: { label: string; text: string }[];
  have: string[];
  onAdd: (text: string) => void;
}) {
  const left = ideas.filter((i) => !have.includes(i.text));
  return (
    <div className="mt-2 pl-6">
      {!have.length && (
        <p className="mb-1 text-xs font-medium text-pink-ink">
          Nothing on this slide yet. Add a suggestion or use Edit slides.
        </p>
      )}
      {have.length > 0 && (
        <ul className="mb-1.5 list-disc pl-4 text-xs text-stone-600">
          {have.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      )}
      {left.length > 0 && (
        <>
          <p className="text-xs text-stone-500">Suggestions from the Hub:</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {left.map((i) => (
              <button
                key={i.text}
                type="button"
                onClick={() => onAdd(i.text)}
                className="rounded-full bg-white px-2.5 py-1 text-left text-xs font-medium text-navy ring-1 ring-cyan hover:bg-cyan/15"
              >
                + {i.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function SlideThumb({
  slide,
  index,
  total,
  region,
  mark,
  tick,
}: {
  slide: DeckSlide;
  index: number;
  total: number;
  region: string;
  mark: HTMLImageElement | null;
  tick: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current)
      drawHangoutSlide(ref.current, slide, { index, total, region, mark });
  }, [slide, index, total, region, mark, tick]);
  return (
    <canvas
      ref={ref}
      className="block h-auto w-full"
      style={{ aspectRatio: "16 / 9" }}
    />
  );
}

// Edit a block (the library or your own), or one block's slides for this
// hangout only.
function BlockEditor({
  editing,
  byId,
  canEdit,
  region,
  mark,
  tick,
  fill,
  onClose,
  onSaveBlock,
  onArchive,
  onSaveItem,
}: {
  editing:
    | { mode: "block"; block: Block | null; section: Section }
    | { mode: "item"; item: PlanItem };
  byId: Map<string, Block>;
  canEdit: boolean;
  region: string;
  mark: HTMLImageElement | null;
  tick: number;
  fill: ReturnType<typeof makeFill>;
  onClose: () => void;
  onSaveBlock: (b: Partial<Block> & { id?: string }) => void;
  onArchive: (b: Block) => void;
  onSaveItem: (slides: SlideData[] | undefined) => void;
}) {
  const source =
    editing.mode === "item" ? byId.get(editing.item.block) : editing.block;
  const [title, setTitle] = useState(source?.title ?? "");
  const [blurb, setBlurb] = useState(source?.blurb ?? "");
  const [minutes, setMinutes] = useState(source?.minutes ?? 5);
  const [section, setSection] = useState<Section>(
    source?.section ??
      (editing.mode === "block" ? editing.section : "icebreaker"),
  );
  const [slides, setSlides] = useState<SlideData[]>(() =>
    structuredClone(
      editing.mode === "item"
        ? itemSlides(editing.item, byId)
        : (source?.slides ?? [
            { layout: "question", heading: "", body: "", notes: "" },
          ]),
    ),
  );

  const set = (i: number, patch: Partial<SlideData>) =>
    setSlides((list) => list.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const moveSlide = (i: number, by: number) =>
    setSlides((list) => {
      const j = i + by;
      if (j < 0 || j >= list.length) return list;
      const c = [...list];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  const preview = buildDeck(
    {
      id: "preview",
      region_id: "",
      hangout_id: null,
      title: "",
      held_on: null,
      items: [{ uid: "p", block: "p", minutes, slides }],
    },
    new Map([
      [
        "p",
        {
          id: "p",
          key: null,
          region_id: null,
          section,
          title: title || "Block",
          blurb: null,
          minutes,
          slides,
          sort_order: 0,
        },
      ],
    ]),
    fill,
  );

  const isItem = editing.mode === "item";
  const heading = isItem
    ? `${source?.title ?? "Block"}: this hangout`
    : source
      ? canEdit
        ? `Edit ${source.title}`
        : source.title
      : "Write your own";
  const readOnly = !canEdit;

  return (
    <Sheet title={heading} onClose={onClose} wide>
      {isItem && (
        <p className="mb-3 text-sm text-stone-600">
          Changes here are for this hangout only. The library block stays as it
          is.
        </p>
      )}
      {!isItem && (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Name of the block"
            disabled={readOnly}
            className={input}
          />
          <select
            value={section}
            onChange={(e) => setSection(e.target.value as Section)}
            disabled={readOnly}
            className="rounded-xl bg-white px-2 py-2 text-sm ring-1 ring-black/10"
          >
            {SECTIONS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label.replace(/s$/, "")}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-sm text-stone-600">
            <input
              type="number"
              min={1}
              max={60}
              value={minutes}
              disabled={readOnly}
              onChange={(e) =>
                setMinutes(
                  Math.max(1, Math.min(60, Number(e.target.value) || 1)),
                )
              }
              className="w-16 rounded-xl bg-white px-2 py-2 text-right ring-1 ring-black/10"
            />
            min
          </label>
          <input
            value={blurb}
            onChange={(e) => setBlurb(e.target.value)}
            placeholder="One line about it (optional)"
            disabled={readOnly}
            className={`${input} sm:col-span-3`}
          />
        </div>
      )}

      <ol className="mt-4 space-y-4">
        {slides.map((s, i) => (
          <li
            key={i}
            className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5"
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs font-semibold text-stone-500">
                    Slide {i + 1}
                  </span>
                  {LAYOUTS.map((l) => (
                    <button
                      key={l.key}
                      type="button"
                      disabled={readOnly}
                      onClick={() => set(i, { layout: l.key as Layout })}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.layout === l.key ? "bg-navy text-white" : "bg-navy/5 text-navy hover:bg-navy/10"}`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
                <input
                  value={s.heading}
                  onChange={(e) => set(i, { heading: e.target.value })}
                  placeholder={
                    s.layout === "question" ? "The question" : "Heading"
                  }
                  disabled={readOnly}
                  className={`${input} font-semibold`}
                />
                {s.layout !== "agenda" && (
                  <input
                    value={s.body ?? ""}
                    onChange={(e) => set(i, { body: e.target.value })}
                    placeholder="Smaller line (optional)"
                    disabled={readOnly}
                    className={input}
                  />
                )}
                {s.layout === "points" && (
                  <textarea
                    value={(s.points ?? []).join("\n")}
                    onChange={(e) =>
                      set(i, { points: e.target.value.split("\n") })
                    }
                    placeholder="One point per line"
                    rows={Math.max(4, (s.points ?? []).length + 1)}
                    disabled={readOnly}
                    className={input}
                  />
                )}
                {s.layout === "agenda" && (
                  <p className="text-xs text-stone-500">
                    Lists every block in the hangout with its time, worked out
                    for you.
                  </p>
                )}
                <textarea
                  value={s.notes ?? ""}
                  onChange={(e) => set(i, { notes: e.target.value })}
                  placeholder="Speaker notes"
                  rows={3}
                  disabled={readOnly}
                  className={`${input} bg-yellow/10`}
                />
              </div>
              <div>
                {preview[i] && (
                  <div className="overflow-hidden rounded-lg ring-1 ring-black/10">
                    <SlideThumb
                      slide={preview[i]}
                      index={i}
                      total={slides.length}
                      region={region}
                      mark={mark}
                      tick={tick}
                    />
                  </div>
                )}
                {!readOnly && (
                  <div className="mt-1.5 flex gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => moveSlide(i, -1)}
                      disabled={i === 0}
                      className="text-stone-500 hover:text-navy disabled:opacity-30"
                    >
                      ↑ Earlier
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSlide(i, 1)}
                      disabled={i === slides.length - 1}
                      className="text-stone-500 hover:text-navy disabled:opacity-30"
                    >
                      ↓ Later
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSlides((l) => l.filter((_, j) => j !== i))
                      }
                      disabled={slides.length === 1}
                      className="ml-auto text-stone-400 hover:text-navy disabled:opacity-30"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {!readOnly && (
        <button
          type="button"
          onClick={() =>
            setSlides((l) => [
              ...l,
              { layout: "points", heading: "", points: [], notes: "" },
            ])
          }
          className={`mt-3 ${quietBtn}`}
        >
          + Add a slide
        </button>
      )}
      <p className="mt-3 text-xs text-stone-500">
        You can write {"{region}"}, {"{month}"}, {"{next_hangout}"} or{" "}
        {"{special}"} and they fill themselves in.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {readOnly ? (
          <p className="text-sm text-stone-600">
            This is a library block. Add it to your hangout, then use Edit
            slides to change it for that hangout.
          </p>
        ) : isItem ? (
          <>
            <button
              type="button"
              onClick={() => onSaveItem(clean(slides))}
              className={pinkBtn}
            >
              Save for this hangout
            </button>
            {editing.item.slides && (
              <button
                type="button"
                onClick={() => onSaveItem(undefined)}
                className={quietBtn}
              >
                Use the library version
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={!title.trim()}
              onClick={() =>
                onSaveBlock({
                  id: source?.id,
                  title: title.trim(),
                  blurb: blurb.trim(),
                  minutes,
                  section,
                  slides: clean(slides),
                })
              }
              className={pinkBtn}
            >
              Save block
            </button>
            {source && (
              <button
                type="button"
                onClick={() => onArchive(source)}
                className="ml-auto text-xs text-stone-400 hover:text-navy"
              >
                Remove from the library
              </button>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}

function clean(slides: SlideData[]): SlideData[] {
  return slides.map((s) => ({
    layout: s.layout,
    heading: s.heading.trim(),
    ...(s.body?.trim() ? { body: s.body.trim() } : {}),
    ...(s.layout === "points"
      ? { points: (s.points ?? []).map((p) => p.trim()).filter(Boolean) }
      : {}),
    ...(s.notes?.trim() ? { notes: s.notes.trim() } : {}),
  }));
}
