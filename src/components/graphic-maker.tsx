"use client";

import { useEffect, useRef, useState } from "react";
import { PhotoUploader } from "@/components/photo-uploader";
import { CarouselMaker } from "@/components/carousel-maker";
import { Sheet } from "@/components/sheet";
import { createClient } from "@/lib/supabase/client";
import {
  loadEventPhotos,
  loadPromoPhotos,
  type EventPhoto,
  type PhotoTag,
} from "@/lib/event-photos";
import {
  TagFilter,
  matchesFilter,
  type PhotoFilter,
} from "@/components/photo-tile";
import {
  drawPoster,
  loadPosterFonts,
  posterDefaults,
  posterText,
} from "@/components/graphic-poster";
import {
  TEASER_COLOURS,
  drawTeaser,
  loadTeaserFonts,
  teaserDefaults,
  teaserText,
  type TeaserColours,
} from "@/components/graphic-teaser";
import {
  drawBigPhoto,
  drawPhotoDetails,
  loadPhotoStyleFonts,
  photoStyleDefaults,
} from "@/components/graphic-photo-styles";

// Event graphics, drawn in the browser on a canvas from the event's details
// and the community's own photos, in We The Free colours, downloaded as PNG.

export type GraphicEvent = {
  title: string;
  startsAt: string;
  endsAt: string | null;
  venue: string | null;
  address: string | null;
  typeName: string | null;
  community: string | null;
  teamId?: string;
  eventId?: string;
};

export type GraphicSize = "post" | "story" | "cover";
const SIZES: Record<GraphicSize, { label: string; w: number; h: number }> = {
  post: { label: "Instagram post", w: 1080, h: 1350 },
  story: { label: "Story", w: 1080, h: 1920 },
  cover: { label: "Facebook event cover", w: 1920, h: 1005 },
};
type Template = "promo" | "recap";
type Style = "classic" | "poster" | "teaser" | "bigphoto" | "details";
const STYLES: Record<Style, string> = {
  classic: "Classic",
  poster: "Poster",
  teaser: "Coming soon",
  bigphoto: "Big photo",
  details: "Photo + details",
};
// Styles with a Warm / WTF colours choice.
const COLOURED: Style[] = ["teaser", "details"];

const NAVY = "#071130";
const PINK = "#ff47b9";
const CYAN = "#2fd9df";
const YELLOW = "#ffd90f";

function lines(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

// Draw an image to fill a box, cropped from the centre.
function cover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(
    img,
    (img.naturalWidth - sw) / 2,
    (img.naturalHeight - sh) / 2,
    sw,
    sh,
    x,
    y,
    w,
    h,
  );
}

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((ok, fail) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // so the canvas can still be downloaded
    img.onload = () => ok(img);
    img.onerror = fail;
    img.src = url;
  });

function fmtDate(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}
function fmtTime(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  })
    .format(new Date(iso))
    .replace(" ", "")
    .toLowerCase();
}

function draw(
  canvas: HTMLCanvasElement,
  e: GraphicEvent,
  size: GraphicSize,
  tz: string,
  template: Template,
  imgs: HTMLImageElement[],
  logo: HTMLImageElement | null,
) {
  const { w, h } = SIZES[size];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const font =
    getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  const wide = size === "cover";
  const pad = Math.round(w * (wide ? 0.05 : 0.08));
  const u = Math.min(w, h) / 1080;

  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, w, h);

  // Photo area: top part (post/story) or right part (cover).
  const hasPhoto = imgs.length > 0;
  const photo = wide
    ? { x: w * 0.45, y: 0, w: w * 0.55, h }
    : { x: 0, y: 0, w, h: h * (size === "story" ? 0.55 : 0.5) };
  if (hasPhoto) {
    if (template === "recap" && imgs.length > 1) {
      // A little grid of the event's photos.
      const n = Math.min(4, imgs.length);
      const cols = n === 2 ? 2 : n >= 3 ? 2 : 1;
      const rows = Math.ceil(n / cols);
      const gap = 6 * u;
      const cw = (photo.w - gap * (cols - 1)) / cols;
      const ch = (photo.h - gap * (rows - 1)) / rows;
      for (let i = 0; i < n; i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const spanAll = n === 3 && i === 2; // last of three fills the row
        cover(
          ctx,
          imgs[i],
          photo.x + c * (cw + gap),
          photo.y + r * (ch + gap),
          spanAll ? photo.w : cw,
          ch,
        );
      }
    } else cover(ctx, imgs[0], photo.x, photo.y, photo.w, photo.h);
    // Fade into navy so the text stays readable.
    const g = wide
      ? ctx.createLinearGradient(photo.x, 0, photo.x + photo.w * 0.45, 0)
      : ctx.createLinearGradient(0, photo.h * 0.55, 0, photo.h);
    g.addColorStop(0, wide ? NAVY : "rgba(7,17,48,0)");
    g.addColorStop(1, wide ? "rgba(7,17,48,0)" : NAVY);
    ctx.fillStyle = g;
    if (wide) ctx.fillRect(photo.x, 0, photo.w * 0.45, h);
    else ctx.fillRect(0, photo.h * 0.55, w, photo.h * 0.45 + 2);
    // Darken the top a touch for the logo.
    const top = ctx.createLinearGradient(0, 0, 0, 220 * u);
    top.addColorStop(0, "rgba(7,17,48,0.55)");
    top.addColorStop(1, "rgba(7,17,48,0)");
    ctx.fillStyle = top;
    ctx.fillRect(wide ? photo.x : 0, 0, wide ? photo.w : w, 220 * u);
  } else {
    ctx.fillStyle = PINK;
    ctx.beginPath();
    ctx.arc(w * 0.92, h * 0.08, 260 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = CYAN;
    ctx.beginPath();
    ctx.arc(w * 0.04, h * 0.98, 200 * u, 0, Math.PI * 2);
    ctx.fill();
  }

  // Brand: the logo, with the community name beside it.
  ctx.textBaseline = "top";
  const logoH = 84 * u;
  let nameX = pad;
  if (logo) {
    const logoW = (logo.width / logo.height) * logoH;
    ctx.drawImage(logo, pad, pad, logoW, logoH);
    nameX = pad + logoW + 20 * u;
  } else {
    ctx.fillStyle = PINK;
    ctx.font = `800 ${34 * u}px ${font}`;
    ctx.fillText("WE THE FREE", pad, pad);
  }
  if (e.community) {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = `600 ${30 * u}px ${font}`;
    if (logo) {
      ctx.textBaseline = "middle";
      ctx.fillText(e.community, nameX, pad + logoH / 2);
      ctx.textBaseline = "top";
    } else ctx.fillText(e.community, pad, pad + 44 * u);
  }

  // Where the text starts.
  let y =
    hasPhoto && !wide
      ? photo.h - 40 * u
      : Math.max(wide ? 0 : h * 0.2, pad + 120 * u);
  const textW = (wide ? w * 0.45 : w) - pad * 2;
  ctx.fillStyle = YELLOW;
  ctx.fillRect(pad, y, 120 * u, 14 * u);
  y += 50 * u;

  // Movie Challenge promos: "3 Minute Movie Challenge" above "Vegan Outreach",
  // rather than the event type and the calendar title.
  const movie =
    template === "promo" && e.typeName?.toLowerCase() === "movie challenge";
  const kicker =
    template === "recap"
      ? "THANKS FOR COMING!"
      : movie
        ? "3 MINUTE MOVIE CHALLENGE"
        : e.typeName?.toUpperCase();
  const title = movie ? "Vegan Outreach" : e.title;
  if (kicker) {
    ctx.fillStyle = CYAN;
    ctx.font = `700 ${36 * u}px ${font}`;
    ctx.fillText(kicker, pad, y);
    y += 60 * u;
  }

  const titleSize = (wide ? 96 : size === "story" ? 116 : 100) * u;
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${titleSize}px ${font}`;
  for (const l of lines(ctx, title, textW).slice(0, 3)) {
    ctx.fillText(l, pad, y);
    y += titleSize * 1.05;
  }

  y += 24 * u;
  ctx.fillStyle = YELLOW;
  ctx.font = `700 ${50 * u}px ${font}`;
  ctx.fillText(fmtDate(e.startsAt, tz), pad, y);
  y += 64 * u;
  if (template === "promo") {
    ctx.fillStyle = "#ffffff";
    ctx.font = `500 ${44 * u}px ${font}`;
    ctx.fillText(
      e.endsAt
        ? `${fmtTime(e.startsAt, tz)} – ${fmtTime(e.endsAt, tz)}`
        : fmtTime(e.startsAt, tz),
      pad,
      y,
    );
    y += 58 * u;
    const place = e.venue ?? e.address;
    if (place)
      for (const l of lines(ctx, place, textW).slice(0, 2)) {
        ctx.fillText(l, pad, y);
        y += 56 * u;
      }
  }

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `600 ${34 * u}px ${font}`;
  ctx.textBaseline = "bottom";
  const foot = "activism.wtf";
  ctx.fillText(
    foot,
    wide ? pad : w - pad - ctx.measureText(foot).width,
    h - pad,
  );
}

export function GraphicMaker({
  event,
  tz,
  initialSize = "post",
  initialTemplate,
  label,
  className = "text-xs font-medium text-pink-ink hover:underline",
  carousel = false,
  photo,
  startOpen = false,
  onClose,
}: {
  event: GraphicEvent;
  tz: string;
  initialSize?: GraphicSize;
  initialTemplate?: Template;
  label?: string;
  className?: string;
  carousel?: boolean; // a carousel of the event's photos instead of one graphic
  photo?: EventPhoto; // started from a Photo Hub photo: use it
  startOpen?: boolean; // opened straight away (no button)
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(startOpen);
  const close = () => {
    setOpen(false);
    onClose?.();
  };
  const [size, setSize] = useState<GraphicSize>(initialSize);
  // Past events start on "Thanks for coming", upcoming ones on "Promote it".
  const [template, setTemplate] = useState<Template>(
    () =>
      initialTemplate ??
      (Date.parse(event.startsAt) < Date.now() ? "recap" : "promo"),
  );
  const [promoPhotos, setPromoPhotos] = useState<EventPhoto[]>([]);
  const [ownPhotos, setOwnPhotos] = useState<EventPhoto[]>([]);
  const [chosen, setChosen] = useState<string | null>(photo?.id ?? null); // photo id, "" = none
  const [tag, setTag] = useState<PhotoFilter>(null);
  const [imgs, setImgs] = useState<HTMLImageElement[]>([]);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [mark, setMark] = useState<HTMLImageElement | null>(null);
  const [style, setStyle] = useState<Style>("classic");
  const [fonts, setFonts] = useState(0); // bumped when a style's fonts load
  const [heading, setHeading] = useState("");
  const [tagline, setTagline] = useState("");
  const [footer, setFooter] = useState("");
  const [noFooter, setNoFooter] = useState(false);
  const [teaserName, setTeaserName] = useState("");
  const [small, setSmall] = useState("");
  const [words, setWords] = useState("");
  const [colours, setColours] = useState<TeaserColours>("warm");
  const [handle, setHandle] = useState<string | null>(null);
  const [reload, setReload] = useState(0); // bumped after an upload
  const canvas = useRef<HTMLCanvasElement>(null);

  // Load the community's photos when the panel opens.
  useEffect(() => {
    if (!open || !event.teamId) return;
    const supabase = createClient();
    let live = true;
    Promise.all([
      loadPromoPhotos(supabase, event.teamId),
      event.eventId
        ? loadEventPhotos(supabase, event.eventId)
        : Promise.resolve([]),
    ]).then(([promo, own]) => {
      if (!live) return;
      // A photo picked in the Photo Hub comes first in both lists.
      const lead = (list: EventPhoto[]) =>
        photo ? [photo, ...list.filter((p) => p.id !== photo.id)] : list;
      setPromoPhotos(lead(promo));
      const usable = lead(own.filter((p) => !p.noPromo));
      setOwnPhotos(usable);
      // No photos from this event yet: nothing to thank people with.
      if (usable.length === 0) setTemplate("promo");
    });
    return () => {
      live = false;
    };
  }, [open, event.teamId, event.eventId, reload, photo]);

  // Which photos the current template uses.
  const all = template === "recap" ? ownPhotos : promoPhotos;
  const pool = all.filter((p) => matchesFilter(p, tag));
  const pickId = chosen === null ? (pool[0]?.id ?? "") : chosen;
  const urls =
    template === "recap"
      ? pickId
        ? [
            pool.find((p) => p.id === pickId)?.url,
            ...pool.filter((p) => p.id !== pickId).map((p) => p.url),
          ]
            .filter((u): u is string => !!u)
            .slice(0, 4)
        : []
      : pickId
        ? [pool.find((p) => p.id === pickId)?.url].filter(
            (u): u is string => !!u,
          )
        : [];
  const urlKey = urls.join("|");

  useEffect(() => {
    let live = true;
    Promise.all(urlKey ? urlKey.split("|").map(loadImage) : [])
      .then((loaded) => live && setImgs(loaded))
      .catch(() => live && setImgs([]));
    return () => {
      live = false;
    };
  }, [urlKey]);

  useEffect(() => {
    if (!open || logo) return;
    let live = true;
    loadImage("/brand/wtf-logo.png")
      .then((l) => live && setLogo(l))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [open, logo]);

  useEffect(() => {
    if (!open || style === "classic") return;
    let live = true;
    const load =
      style === "poster"
        ? loadPosterFonts()
        : style === "teaser"
          ? loadTeaserFonts()
          : loadPhotoStyleFonts();
    load.then(() => live && setFonts((n) => n + 1));
    if (!mark)
      loadImage("/brand/wtf-mark.png")
        .then((m) => live && setMark(m))
        .catch(() => {});
    return () => {
      live = false;
    };
  }, [open, style, mark]);

  // The community's Instagram username, for the photo styles.
  useEffect(() => {
    if (!open || !event.teamId) return;
    let live = true;
    createClient()
      .from("teams")
      .select("instagram_handle")
      .eq("id", event.teamId)
      .maybeSingle()
      .then(({ data }) => live && setHandle(data?.instagram_handle ?? null));
    return () => {
      live = false;
    };
  }, [open, event.teamId]);

  useEffect(() => {
    if (!open || !canvas.current) return;
    const { w: cw, h: ch } = SIZES[size];
    const recap = template === "recap";
    if (style === "teaser") {
      drawTeaser(canvas.current, {
        w: cw,
        h: ch,
        text: teaserText(event, tz, recap, heading, teaserName, small),
        colours,
        mark,
      });
    } else if (style === "bigphoto" || style === "details") {
      (style === "bigphoto" ? drawBigPhoto : drawPhotoDetails)(canvas.current, {
        w: cw,
        h: ch,
        e: event,
        tz,
        recap,
        heading,
        words,
        handle,
        photo: imgs[0] ?? null,
        mark,
        colours,
      });
    } else if (style === "poster") {
      const { w, h } = SIZES[size];
      drawPoster(canvas.current, {
        w,
        h,
        text: posterText(
          event,
          tz,
          template === "recap",
          heading,
          tagline,
          footer,
          noFooter,
        ),
        imgs,
        logo,
        mark,
        font:
          getComputedStyle(document.body).fontFamily || "system-ui, sans-serif",
      });
    } else draw(canvas.current, event, size, tz, template, imgs, logo);
  }, [
    open,
    size,
    event,
    tz,
    template,
    imgs,
    logo,
    style,
    fonts,
    mark,
    heading,
    tagline,
    footer,
    noFooter,
    teaserName,
    small,
    words,
    colours,
    handle,
  ]);
  const defaults = posterDefaults(event, template === "recap");
  const tDefaults = teaserDefaults(event, template === "recap");
  const pDefaults = photoStyleDefaults(event, template === "recap");
  const input =
    "mt-1 block w-full rounded-lg bg-white px-2.5 py-1.5 text-sm text-navy ring-1 ring-stone-300 placeholder:text-stone-400";
  const defaultFooter =
    posterText(event, tz, template === "recap", heading, tagline).footer ?? "";

  const [copied, setCopied] = useState<"" | "done" | "failed">("");
  // Copy the picture, to paste straight into WhatsApp, Instagram or Facebook.
  async function copy() {
    const c = canvas.current;
    if (!c) return;
    try {
      // Safari wants the ClipboardItem made straight away, with a promise.
      const png = new Promise<Blob>((resolve, reject) =>
        c.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("no image"))),
          "image/png",
        ),
      );
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": png }),
      ]);
      setCopied("done");
    } catch {
      setCopied("failed");
    }
    setTimeout(() => setCopied(""), 2500);
  }

  function download() {
    if (!canvas.current) return;
    const a = document.createElement("a");
    a.href = canvas.current.toDataURL("image/png");
    const slug = event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    a.download = `${slug}-${template}${style === "classic" ? "" : `-${style}`}-${size}.png`;
    a.click();
  }

  return (
    <>
      {!startOpen && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={className}
        >
          {label ?? (carousel ? "Make carousel" : "Make graphic")}
        </button>
      )}
      {open && (
        <Sheet title={carousel ? "Carousel" : "Event graphic"} onClose={close}>
          {carousel && ownPhotos.length === 0 ? (
            <p className="mt-1 text-sm text-stone-600">
              Add photos from this event and you can make a carousel from them.
            </p>
          ) : carousel ? (
            <CarouselMaker
              key={ownPhotos.map((p) => p.id).join()}
              photos={ownPhotos}
              title={event.title}
              teamId={event.teamId}
              eventId={event.eventId}
            />
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="mr-0.5 text-xs font-medium text-stone-500">
                  Style
                </span>
                {(Object.keys(STYLES) as Style[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStyle(s)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                      style === s
                        ? "bg-navy text-white ring-navy"
                        : "bg-white text-stone-500 ring-stone-300"
                    }`}
                  >
                    {STYLES[s]}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(SIZES) as GraphicSize[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                      size === s
                        ? "bg-pink/20 text-pink-ink ring-pink/40"
                        : "bg-white text-stone-500 ring-stone-300"
                    }`}
                  >
                    {SIZES[s].label}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex justify-center rounded-2xl bg-stone-100 p-3">
                <canvas
                  ref={canvas}
                  className="max-h-[48vh] w-auto max-w-full rounded-lg shadow"
                />
              </div>

              {style === "poster" && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs font-medium text-stone-500">
                    Heading
                    <input
                      value={heading}
                      onChange={(e) => setHeading(e.target.value)}
                      placeholder={defaults.heading}
                      maxLength={60}
                      className="mt-1 block w-full rounded-lg bg-white px-2.5 py-1.5 text-sm text-navy ring-1 ring-stone-300 placeholder:text-stone-400"
                    />
                  </label>
                  <label className="text-xs font-medium text-stone-500">
                    Tagline
                    <input
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder={defaults.tagline}
                      maxLength={40}
                      className="mt-1 block w-full rounded-lg bg-white px-2.5 py-1.5 text-sm text-navy ring-1 ring-stone-300 placeholder:text-stone-400"
                    />
                  </label>
                  <div className="text-xs font-medium text-stone-500 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <span>Bottom line</span>
                      <label className="flex items-center gap-1.5 font-normal">
                        <input
                          type="checkbox"
                          checked={noFooter}
                          onChange={(e) => setNoFooter(e.target.checked)}
                        />
                        Remove it
                      </label>
                    </div>
                    <input
                      value={footer}
                      onChange={(e) => setFooter(e.target.value)}
                      placeholder={defaultFooter}
                      maxLength={80}
                      disabled={noFooter}
                      aria-label="Bottom line"
                      className="mt-1 block w-full rounded-lg bg-white px-2.5 py-1.5 text-sm text-navy ring-1 ring-stone-300 placeholder:text-stone-400 disabled:opacity-40"
                    />
                  </div>
                </div>
              )}

              {style !== "classic" && style !== "poster" && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs font-medium text-stone-500">
                    Heading
                    <input
                      value={heading}
                      onChange={(e) => setHeading(e.target.value)}
                      placeholder={
                        style === "teaser"
                          ? tDefaults.heading.toUpperCase()
                          : pDefaults.heading.toUpperCase()
                      }
                      maxLength={60}
                      className={input}
                    />
                  </label>
                  {style === "teaser" && (
                    <>
                      <label className="text-xs font-medium text-stone-500">
                        Event name
                        <input
                          value={teaserName}
                          onChange={(e) => setTeaserName(e.target.value)}
                          placeholder={tDefaults.name}
                          maxLength={50}
                          className={input}
                        />
                      </label>
                      <label className="text-xs font-medium text-stone-500">
                        Small line above the date
                        <input
                          value={small}
                          onChange={(e) => setSmall(e.target.value)}
                          placeholder={tDefaults.small.toUpperCase()}
                          maxLength={30}
                          className={input}
                        />
                      </label>
                    </>
                  )}
                  {style === "bigphoto" && (
                    <label className="text-xs font-medium text-stone-500">
                      Words at the top right
                      <input
                        value={words}
                        onChange={(e) => setWords(e.target.value)}
                        placeholder={pDefaults.words}
                        maxLength={70}
                        className={input}
                      />
                    </label>
                  )}
                  {COLOURED.includes(style) && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500 sm:col-span-2">
                      Colours
                      {(Object.keys(TEASER_COLOURS) as TeaserColours[]).map(
                        (c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setColours(c)}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                              colours === c
                                ? "bg-navy text-white ring-navy"
                                : "bg-white text-stone-500 ring-stone-300"
                            }`}
                          >
                            {TEASER_COLOURS[c]}
                          </button>
                        ),
                      )}
                    </div>
                  )}
                  {style !== "teaser" && !handle && (
                    <p className="text-xs text-stone-500 sm:col-span-2">
                      Add your community&apos;s Instagram username in the Social
                      Media Hub and it goes on these.
                    </p>
                  )}
                </div>
              )}

              {all.length > 0 && style !== "teaser" && (
                <div className="mt-3">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <p className="text-xs font-medium text-stone-500">
                      {template === "recap" ? "Lead photo" : "Photo"}
                    </p>
                    <TagFilter
                      photos={all}
                      value={tag}
                      onChange={(t) => {
                        setTag(t);
                        setChosen(null);
                      }}
                      small
                    />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {template === "promo" && (
                      <button
                        type="button"
                        onClick={() => setChosen("")}
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-navy text-[10px] font-semibold text-white ring-2 ${pickId === "" ? "ring-pink" : "ring-transparent"}`}
                      >
                        No photo
                      </button>
                    )}
                    {pool.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setChosen(p.id)}
                        className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-2 ${pickId === p.id ? "ring-pink" : "ring-transparent"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                        <img
                          src={p.url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        {p.favourite && (
                          <span className="absolute left-0.5 top-0.5 text-[10px]">
                            ⭐
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={download}
                  className="flex-1 rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong"
                >
                  Download PNG
                </button>
                <button
                  type="button"
                  onClick={copy}
                  className="flex-1 rounded-xl bg-white px-4 py-2.5 font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50"
                >
                  {copied === "done"
                    ? "Copied"
                    : copied === "failed"
                      ? "Couldn't copy: use Download"
                      : "Copy image"}
                </button>
              </div>
            </>
          )}
          {event.teamId && event.eventId && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <PhotoUploader
                teamId={event.teamId}
                eventId={event.eventId}
                label="Add photos"
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-navy ring-1 ring-black/10 hover:bg-white"
                onUploaded={() => setReload((n) => n + 1)}
              />
              {promoPhotos.length === 0 && template === "promo" && (
                <span className="text-xs text-stone-500">
                  Photos you add will appear here.
                </span>
              )}
            </div>
          )}
        </Sheet>
      )}
    </>
  );
}
