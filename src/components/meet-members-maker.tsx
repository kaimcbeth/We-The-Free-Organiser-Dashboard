"use client";

import { SaveToPlanner } from "@/components/save-to-planner";
import { useEffect, useRef, useState } from "react";
import { zipSync } from "fflate";
import { Sheet } from "@/components/sheet";
import { loadPosterFonts } from "@/components/graphic-poster";
import {
  CENTRE,
  DISPLAY,
  H,
  NAVY,
  PINK,
  W,
  YELLOW,
  bodyFont,
  communityLabel,
  drawPhoto,
  fit,
  loadImage,
  logo,
  shade,
  wrap,
  type Pos,
} from "@/components/recap-maker";
import { createClient } from "@/lib/supabase/client";
import { getMeetMembersQuestions } from "@/app/actions";
import {
  parseQuestions,
  splitAnswers,
  type MeetQuestion,
} from "@/lib/meet-members";

// Meet the Members carousel (Kai, 4 Nov 2026). Instagram carousel, 4:5:
//   1. Cover: their first photo, "MEET THE MEMBERS" and their name.
//   2. One photo per question, the question over a bottom fade.
// The answers go in the captions (one per slide, or all as one caption).

type Photo = { id: string; url: string; img: HTMLImageElement };
type Look = {
  name: string;
  community: string;
  mark: HTMLImageElement | null;
  total: number;
};

function drawCover(
  ctx: CanvasRenderingContext2D,
  p: Photo,
  pos: Pos,
  look: Look,
) {
  drawPhoto(ctx, p.img, pos);
  shade(ctx, 0.3, 0.94);
  logo(ctx, look.mark);
  const x = 72;
  const width = W - 2 * x;
  const display = (s: number) => `${s}px ${DISPLAY}`;
  const big = Math.min(
    fit(ctx, "MEMBERS", display, width, 190, 100),
    fit(ctx, "MEET THE", display, width, 190, 100),
  );
  const name = look.name.trim().toUpperCase() || "THEIR NAME";
  const nameSize = fit(ctx, name, display, width, 130, 56);
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 16;
  let y = H - 90;
  ctx.font = `700 34px ${bodyFont()}`;
  ctx.fillStyle = "#ffffff";
  ctx.letterSpacing = "4px";
  ctx.fillText(look.community, x, y);
  ctx.letterSpacing = "0px";
  y -= 64;
  ctx.font = display(nameSize);
  ctx.fillStyle = YELLOW;
  ctx.fillText(name, x - 4, y);
  y -= Math.round(nameSize * 0.95) + 26;
  ctx.font = display(big);
  ctx.fillStyle = PINK;
  ctx.fillText("MEMBERS", x - 6, y);
  y -= Math.round(big * 0.98);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("MEET THE", x - 6, y);
  ctx.shadowBlur = 0;
}

function drawQuestion(
  ctx: CanvasRenderingContext2D,
  p: Photo,
  pos: Pos,
  q: MeetQuestion,
  n: number,
  look: Look,
) {
  drawPhoto(ctx, p.img, pos);
  shade(ctx, 0.42, 0.94);
  logo(ctx, look.mark);
  const x = 72;
  const width = W - 2 * x;
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 12;
  // The question, from the bottom up (up to 4 lines).
  let size = 74;
  let lines: string[] = [];
  for (; size >= 48; size -= 4) {
    ctx.font = `${size}px ${DISPLAY}`;
    lines = wrap(ctx, q.emoji ? `${q.emoji} ${q.text}` : q.text, width, 4);
    if (!lines[lines.length - 1].endsWith("…")) break;
  }
  let y = H - 96;
  const step = Math.round(size * 1.12);
  for (let i = lines.length - 1; i >= 0; i--) {
    ctx.fillStyle = "#ffffff";
    ctx.fillText(lines[i], x, y);
    y -= step;
  }
  // First question only: point people to the caption (Kai, 6 Nov).
  if (n === 1) {
    ctx.font = `600 28px ${bodyFont()}`;
    ctx.fillStyle = YELLOW;
    ctx.fillText("Answers in the caption ↓", x, H - 40);
  }
  y -= 16;
  ctx.shadowBlur = 0;
  // Pink tag: name · n of N.
  const label = `${(look.name.trim().split(/\s+/)[0] || "MEET THE MEMBERS").toUpperCase()}  ·  ${n} / ${look.total}`;
  ctx.font = `800 26px ${bodyFont()}`;
  ctx.letterSpacing = "2px";
  const tw = ctx.measureText(label).width;
  const ph = 46;
  ctx.fillStyle = PINK;
  ctx.beginPath();
  ctx.roundRect(x, y - ph + 10, tw + 36, ph, ph / 2);
  ctx.fill();
  ctx.fillStyle = NAVY;
  ctx.fillText(label, x + 18, y - 4);
  ctx.letterSpacing = "0px";
}

function draw(
  canvas: HTMLCanvasElement,
  i: number,
  p: Photo,
  pos: Pos,
  qs: MeetQuestion[],
  look: Look,
) {
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(canvas.width / W, canvas.width / W);
  if (i === 0) drawCover(ctx, p, pos, look);
  else drawQuestion(ctx, p, pos, qs[i - 1], i, look);
}

const btn =
  "rounded-xl bg-pink px-3 py-1.5 text-sm font-semibold text-navy hover:bg-pink-strong disabled:opacity-50";
const quiet =
  "rounded-lg px-2 py-1 text-xs font-medium text-stone-500 hover:bg-black/5 hover:text-navy disabled:opacity-30";

export function MeetMembersMaker({
  teamId,
  onClose,
  questions,
}: {
  teamId: string;
  onClose: () => void;
  questions?: string; // for tests: skip loading the community's list
}) {
  const [qs, setQs] = useState<MeetQuestion[] | null>(null);
  const [community, setCommunity] = useState("WE THE FREE");
  const [mark, setMark] = useState<HTMLImageElement | null>(null);
  const [fontsOk, setFontsOk] = useState(false);
  const [name, setName] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pos, setPos] = useState<Record<string, Pos>>({});
  // Photos that already carry the WTF logo: don't add a second one.
  const [noLogo, setNoLogo] = useState<Record<string, boolean>>({});
  const [reply, setReply] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [coverCaption, setCoverCaption] = useState("");
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [made, setMade] = useState<File[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    loadPosterFonts()?.then(() => live && setFontsOk(true));
    loadImage("/brand/wtf-mark.png")
      .then((img) => live && setMark(img))
      .catch(() => {});
    (questions ? Promise.resolve({ questions }) : getMeetMembersQuestions())
      .then((r) => live && setQs(parseQuestions(r.questions)))
      .catch(() => live && setQs([]));
    createClient()
      .from("teams")
      .select("name")
      .eq("id", teamId)
      .single()
      .then(({ data }) => {
        if (live && data?.name) setCommunity(communityLabel(data.name));
      });
    return () => {
      live = false;
    };
  }, [teamId, questions]);

  const total = qs?.length ?? 0;
  const need = total + 1;
  const look: Look = { name, community, mark, total };
  const first = name.trim().split(/\s+/)[0];
  const cover = coverCaption || `👋 Meet ${first || "…"}!`;
  const captionFor = (i: number) =>
    i === 0 ? cover : `${qs![i - 1].full}\n${answers[i - 1]?.trim() || "…"}`;
  const allCaption = [
    cover,
    ...(qs ?? []).map((_, i) => captionFor(i + 1)),
  ].join("\n\n");

  const changed = () => {
    setMade(null);
    setNote("");
  };

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const add: Photo[] = [];
    for (const f of Array.from(list)) {
      if (!f.type.startsWith("image/")) continue;
      const url = URL.createObjectURL(f);
      try {
        add.push({
          id: `${f.name}-${f.size}-${url}`,
          url,
          img: await loadImage(url),
        });
      } catch {
        URL.revokeObjectURL(url);
      }
    }
    setPhotos((p) => [...p, ...add]);
    changed();
  }
  const move = (i: number, by: number) => {
    setPhotos((p) => {
      const j = i + by;
      if (j < 0 || j >= p.length) return p;
      const n = [...p];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
    changed();
  };
  const remove = (i: number) => {
    setPhotos((p) => p.filter((_, k) => k !== i));
    changed();
  };

  const split = (text: string) => {
    setReply(text);
    if (qs) setAnswers(splitAnswers(qs, text));
    changed();
  };

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? "" : c)), 2000);
    } catch {
      setNote("Couldn't copy here. Select the text and copy it instead.");
    }
  }

  const shown = photos.slice(0, need);
  const fileBase = `meet-the-members-${(first || "member").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  async function build(): Promise<File[]> {
    if (!qs) return [];
    const files: File[] = [];
    for (let i = 0; i < shown.length; i++) {
      setBusy(`Making slide ${i + 1} of ${shown.length}…`);
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      draw(
        canvas,
        i,
        shown[i],
        pos[shown[i].id] ?? CENTRE,
        qs,
        noLogo[shown[i].id] ? { ...look, mark: null } : look,
      );
      const blob = await new Promise<Blob>((ok, no) =>
        canvas.toBlob(
          (b) => (b ? ok(b) : no(new Error("no image"))),
          "image/jpeg",
          0.92,
        ),
      );
      files.push(
        new File([blob], `${fileBase}-${String(i + 1).padStart(2, "0")}.jpg`, {
          type: "image/jpeg",
        }),
      );
    }
    return files;
  }
  async function make() {
    setNote("");
    try {
      setMade(await build());
    } catch {
      setNote("Something went wrong making the slides. Try again?");
    } finally {
      setBusy("");
    }
  }
  async function share() {
    if (!made) return;
    try {
      await navigator.share({ files: made });
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setNote("Couldn't open sharing here. Use Download instead.");
    }
  }
  const canShare =
    !!made &&
    typeof navigator !== "undefined" &&
    !!navigator.canShare?.({ files: made });
  async function download() {
    setNote("");
    try {
      const files = made ?? (await build());
      setBusy("Zipping…");
      const entries: Record<string, Uint8Array> = {};
      for (const f of files)
        entries[f.name] = new Uint8Array(await f.arrayBuffer());
      const zip = zipSync(entries, { level: 0 });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob([zip as BlobPart], { type: "application/zip" }),
      );
      a.download = `${fileBase}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    } catch {
      setNote("Something went wrong making the slides. Try again?");
    } finally {
      setBusy("");
    }
  }

  const label = (i: number) => (i === 0 ? "Cover" : `Question ${i}`);
  const h3 = "text-sm font-semibold text-navy";

  return (
    <Sheet title="Meet the Members" onClose={onClose}>
      {!qs ? (
        <p className="text-sm text-stone-500">Loading the questions…</p>
      ) : (
        <div className="space-y-6">
          <label className="block">
            <span className={h3}>Their name</span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                changed();
              }}
              placeholder="e.g. Jessie Tran"
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </label>

          <section>
            <h3 className={h3}>Their answers</h3>
            <p className="mt-1 text-sm text-stone-500">
              Paste their whole reply, or upload it as a text file. It&apos;s
              split into one caption per slide.
            </p>
            <textarea
              value={reply}
              onChange={(e) => split(e.target.value)}
              rows={4}
              placeholder="Paste their reply here"
              className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
            />
            <input
              ref={textRef}
              type="file"
              accept=".txt,.md,text/plain"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) split(await f.text());
              }}
            />
            <button
              type="button"
              onClick={() => textRef.current?.click()}
              className="mt-1 text-xs font-medium text-stone-500 underline-offset-2 hover:text-navy hover:underline"
            >
              Upload a text file instead
            </button>
          </section>

          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className={h3}>Captions</h3>
              <button
                type="button"
                onClick={() => copy(allCaption, "all")}
                className="text-xs font-semibold text-navy underline-offset-2 hover:underline"
              >
                {copied === "all" ? "Copied" : "Copy all as one"}
              </button>
            </div>
            {Array.from({ length: need }, (_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-navy">
                    <span className="mr-1.5 text-xs text-stone-400">
                      {i + 1}
                    </span>
                    {i === 0 ? "Cover" : qs[i - 1].full}
                  </p>
                  <button
                    type="button"
                    onClick={() => copy(captionFor(i), `c${i}`)}
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      copied === `c${i}`
                        ? "bg-cyan text-navy"
                        : "bg-pink text-navy hover:bg-pink-strong"
                    }`}
                  >
                    {copied === `c${i}` ? "Copied" : "Copy"}
                  </button>
                </div>
                {i === 0 ? (
                  <input
                    value={coverCaption}
                    onChange={(e) => setCoverCaption(e.target.value)}
                    placeholder={cover}
                    className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
                  />
                ) : (
                  <textarea
                    value={answers[i - 1] ?? ""}
                    onChange={(e) => {
                      const a = [...answers];
                      a[i - 1] = e.target.value;
                      setAnswers(a);
                    }}
                    rows={2}
                    placeholder="Their answer"
                    className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
                  />
                )}
              </div>
            ))}
          </section>

          <section>
            <div className="flex items-baseline justify-between">
              <h3 className={h3}>Photos</h3>
              <span className="text-xs text-stone-500">
                {photos.length} of {need}
              </span>
            </div>
            <p className="mt-1 text-sm text-stone-500">
              {need} photos of them: the first is the cover, then one for each
              question. Drag a slide to move the photo in its frame.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`mt-2 ${btn}`}
            >
              {photos.length ? "Add more photos" : "Choose photos"}
            </button>
            {photos.length > need && (
              <p className="mt-2 text-xs text-stone-500">
                Only the first {need} are used.
              </p>
            )}
          </section>

          <section className="space-y-5">
            <h3 className={h3}>Slides</h3>
            {Array.from({ length: need }, (_, i) => {
              const p = shown[i];
              return (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
                      {i + 1}. {label(i)}
                    </span>
                    {p && (
                      <span className="flex">
                        <button
                          type="button"
                          className={quiet}
                          disabled={i === 0}
                          onClick={() => move(i, -1)}
                          aria-label="Move photo earlier"
                        >
                          ‹ Earlier
                        </button>
                        <button
                          type="button"
                          className={quiet}
                          disabled={i === photos.length - 1}
                          onClick={() => move(i, 1)}
                          aria-label="Move photo later"
                        >
                          Later ›
                        </button>
                        <button
                          type="button"
                          className={quiet}
                          onClick={() => remove(i)}
                        >
                          Remove
                        </button>
                        <button
                          type="button"
                          className={quiet}
                          onClick={() => {
                            setNoLogo((o) => ({ ...o, [p.id]: !o[p.id] }));
                            changed();
                          }}
                        >
                          {noLogo[p.id] ? "Add logo" : "No logo"}
                        </button>
                      </span>
                    )}
                  </div>
                  {p ? (
                    <SlideCanvas
                      i={i}
                      photo={p}
                      pos={pos[p.id] ?? CENTRE}
                      qs={qs}
                      look={noLogo[p.id] ? { ...look, mark: null } : look}
                      ready={fontsOk}
                      onPos={(np) => {
                        setPos((o) => ({ ...o, [p.id]: np }));
                        changed();
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex aspect-[4/5] w-full items-center justify-center rounded-lg border-2 border-dashed border-stone-300 text-sm text-stone-400 hover:border-pink hover:text-navy"
                    >
                      {i === 0 ? "Cover photo" : `Photo for: ${qs[i - 1].text}`}
                    </button>
                  )}
                </div>
              );
            })}
          </section>

          <section className="space-y-3 border-t border-stone-200 pt-4">
            {photos.length < need && (
              <p className="text-sm text-stone-500">
                Add {need - photos.length} more photo
                {need - photos.length === 1 ? "" : "s"} for every question to
                get a slide.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {!made ? (
                <button
                  type="button"
                  onClick={make}
                  disabled={!shown.length || !!busy}
                  className={btn}
                >
                  Make the slides
                </button>
              ) : (
                canShare && (
                  <button type="button" onClick={share} className={btn}>
                    Share
                  </button>
                )
              )}
              <button
                type="button"
                onClick={download}
                disabled={!shown.length || !!busy}
                className="rounded-xl bg-navy/5 px-3 py-1.5 text-sm font-semibold text-navy hover:bg-navy/10 disabled:opacity-50"
              >
                Download
              </button>
            </div>
            <SaveToPlanner
              teamId={teamId}
              note={`Meet the Members: ${first || "new member"}`}
              caption={allCaption}
              captions={[cover, ...(qs ?? []).map((_, i) => captionFor(i + 1))]}
              platforms={["instagram"]}
              getImages={async () => {
                if (!shown.length) return [];
                const files = made ?? (await build());
                setBusy("");
                return files;
              }}
              className="rounded-xl bg-navy/5 px-3 py-1.5 text-sm font-semibold text-navy hover:bg-navy/10"
            />
            {busy && <p className="text-sm text-stone-500">{busy}</p>}
            {made && !busy && (
              <p className="text-sm text-stone-500">
                {made.length} slides ready.
              </p>
            )}
            {note && <p className="text-sm text-red-600">{note}</p>}
          </section>
        </div>
      )}
    </Sheet>
  );
}

function SlideCanvas({
  i,
  photo,
  pos,
  qs,
  look,
  ready,
  onPos,
}: {
  i: number;
  photo: Photo;
  pos: Pos;
  qs: MeetQuestion[];
  look: Look;
  ready: boolean;
  onPos: (p: Pos) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const { name, community, mark, total } = look;

  useEffect(() => {
    if (ref.current)
      draw(ref.current, i, photo, pos, qs, { name, community, mark, total });
  }, [i, photo, pos, qs, name, community, mark, total, ready]);

  return (
    <canvas
      ref={ref}
      width={360}
      height={450}
      className="w-full cursor-grab touch-none rounded-lg shadow active:cursor-grabbing"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const im = photo.img;
        const box = e.currentTarget.getBoundingClientRect();
        const s = Math.max(
          box.width / im.naturalWidth,
          box.height / im.naturalHeight,
        );
        const overX = im.naturalWidth * s - box.width;
        const overY = im.naturalHeight * s - box.height;
        drag.current = { x: e.clientX, y: e.clientY };
        const clamp = (n: number) => Math.min(1, Math.max(0, n));
        onPos({
          x: overX > 0.5 ? clamp(pos.x - (e.clientX - d.x) / overX) : 0.5,
          y: overY > 0.5 ? clamp(pos.y - (e.clientY - d.y) / overY) : 0.5,
        });
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    />
  );
}

// Opens the maker (the "Meet the Members posted" action).
export function MeetMembersButton({
  teamId,
  className,
  label = "Make the post",
}: {
  teamId: string;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      {open && (
        <MeetMembersMaker teamId={teamId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
