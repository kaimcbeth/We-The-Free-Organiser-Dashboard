"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resolveMapsLink } from "@/app/map-link-actions";
import {
  isMapsLink,
  isShortMapsLink,
  spotFromCoords,
  spotFromMapsUrl,
} from "@/lib/map-link";
import { Sheet } from "@/components/sheet";
import { SaveToPlanner } from "@/components/save-to-planner";
import type { GraphicEvent } from "@/components/graphic-maker";
import { loadPosterFonts } from "@/components/graphic-poster";
import {
  loadPhotoStyleFonts,
  shortTitle,
} from "@/components/graphic-photo-styles";
import {
  MAP_LOOKS,
  MEET_SIZES,
  drawMeetingPoint,
  pinSpot,
  renderMap,
  type MapLook,
  type MeetSize,
  type MeetTexts,
} from "@/components/meeting-point-graphic";
import type { Spot } from "@/components/meeting-point-map";

// Leaflet needs the browser.
const MeetingPointMap = dynamic(
  () => import("@/components/meeting-point-map").then((m) => m.MeetingPointMap),
  { ssr: false },
);

type Saved = Spot & { note: string | null; zoom: number | null };
type EarlierSpot = Saved & { event: string; used: string };
type Found = { name: string; lat: number; lng: number };

// Two OpenStreetMap searches: Nominatim (addresses) and Photon (more
// forgiving with names), nearest to the community first.
async function findPlaces(q: string, near: Spot | null): Promise<Found[]> {
  const nominatim = async () => {
    const url =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=" +
      encodeURIComponent(q) +
      (near
        ? `&viewbox=${near.lng - 1},${near.lat + 1},${near.lng + 1},${near.lat - 1}`
        : "");
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const rows = (await res.json()) as {
      display_name: string;
      lat: string;
      lon: string;
    }[];
    return rows.map((r) => ({
      name: r.display_name,
      lat: Number(r.lat),
      lng: Number(r.lon),
    }));
  };
  const photon = async () => {
    const url =
      "https://photon.komoot.io/api/?limit=5&q=" +
      encodeURIComponent(q) +
      (near ? `&lat=${near.lat}&lon=${near.lng}` : "");
    const res = await fetch(url);
    const data = (await res.json()) as {
      features: {
        geometry: { coordinates: [number, number] };
        properties: Record<string, string | undefined>;
      }[];
    };
    return data.features.map((f) => {
      const p = f.properties;
      const street = [p.housenumber, p.street].filter(Boolean).join(" ");
      return {
        name: [p.name, street, p.city ?? p.district, p.state]
          .filter(Boolean)
          .filter((x, i, a) => a.indexOf(x) === i)
          .join(", "),
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      };
    });
  };
  const [a, b] = await Promise.all([
    nominatim().catch(() => [] as Found[]),
    photon().catch(() => [] as Found[]),
  ]);
  const list: Found[] = [];
  for (const f of [...a, ...b]) {
    if (!f.name || !Number.isFinite(f.lat)) continue;
    if (
      list.some(
        (g) => Math.abs(g.lat - f.lat) < 2e-4 && Math.abs(g.lng - f.lng) < 2e-4,
      )
    )
      continue;
    list.push(f);
  }
  return list.slice(0, 6);
}

const MIN_ZOOM = 14;
const MAX_ZOOM = 19;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const mapLink = (s: Spot) =>
  `https://www.google.com/maps/search/?api=1&query=${s.lat.toFixed(6)},${s.lng.toFixed(6)}`;

function whenLine(e: GraphicEvent, tz: string) {
  const f = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-AU", { timeZone: tz, ...o }).format(
      new Date(e.startsAt),
    );
  const day = f({ weekday: "short", day: "numeric", month: "short" });
  const time = f({ hour: "numeric", minute: "2-digit" })
    .replace(/\s/g, "")
    .replace(":00", "")
    .toUpperCase();
  return `${day} · ${time}`.toUpperCase();
}

// "Meeting point": pick the spot on a map, say where exactly, and get a
// graphic for socials (Kai, 11 Nov 2026). The spot is saved on the event,
// and the community's earlier spots can be picked again.
export function MeetingPointMaker({
  event,
  tz,
  label = "Meeting point",
  className = "text-xs font-medium text-pink-ink hover:underline",
  planDay,
}: {
  event: GraphicEvent & { teamId: string; eventId: string };
  tz: string;
  label?: string;
  className?: string;
  planDay?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      {open && (
        <Maker
          event={event}
          tz={tz}
          planDay={planDay}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function Maker({
  event,
  tz,
  planDay,
  onClose,
}: {
  event: GraphicEvent & { teamId: string; eventId: string };
  tz: string;
  planDay?: string;
  onClose: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [centre, setCentre] = useState<Spot | null>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [zoom, setZoom] = useState(17);
  const [look, setLook] = useState<MapLook>("light");
  const [size, setSize] = useState<MeetSize>("post");
  const [earlier, setEarlier] = useState<EarlierSpot[]>([]);
  const [handle, setHandle] = useState<string | null>(null);
  const [mark, setMark] = useState<HTMLImageElement | null>(null);
  const [fonts, setFonts] = useState(0);
  const [query, setQuery] = useState(event.address ?? event.venue ?? "");
  const [found, setFound] = useState<Found[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [saved, setSaved] = useState<"" | "saving" | "saved" | "failed">("");
  const [copied, setCopied] = useState<"" | "image" | "link">("");
  const [edits, setEdits] = useState<Partial<MeetTexts>>({});
  const canvas = useRef<HTMLCanvasElement>(null);
  const dirty = useRef(false);

  const texts: MeetTexts = {
    kicker: edits.kicker ?? "Meeting point",
    where: edits.where ?? "",
    when: edits.when ?? whenLine(event, tz),
    what: edits.what ?? shortTitle(event.title, event.community),
    footer:
      edits.footer ??
      (handle ? `@${handle} · www.activism.wtf` : "www.activism.wtf"),
  };
  const set = (k: keyof MeetTexts, v: string) =>
    setEdits((e) => ({ ...e, [k]: v }));

  // What's saved already: this event's spot, earlier spots, the community's
  // position and Instagram username.
  useEffect(() => {
    const supabase = createClient();
    let live = true;
    Promise.all([
      supabase
        .from("events")
        .select("meet_lat, meet_lng, meet_note, meet_zoom")
        .eq("id", event.eventId)
        .maybeSingle(),
      supabase.rpc("team_meeting_points", { p_team_id: event.teamId }),
      supabase
        .from("teams")
        .select("instagram_handle")
        .eq("id", event.teamId)
        .maybeSingle(),
    ]).then(([ev, pts, team]) => {
      if (!live) return;
      const info = pts.data as {
        centre: Spot | null;
        spots: EarlierSpot[];
      } | null;
      setEarlier(info?.spots ?? []);
      setHandle(team.data?.instagram_handle ?? null);
      const e = ev.data;
      if (e?.meet_lat != null && e.meet_lng != null) {
        const s = { lat: e.meet_lat, lng: e.meet_lng };
        setSpot(s);
        setCentre(s);
        if (e.meet_zoom) setZoom(e.meet_zoom);
        if (e.meet_note) setEdits((x) => ({ ...x, where: e.meet_note }));
      } else {
        setCentre(info?.centre ?? { lat: -33.8688, lng: 151.2093 });
        // Start at the event's address, if the map can find it.
        const start = event.address ?? event.venue;
        if (start)
          findPlaces(start, info?.centre ?? null).then(
            (l) => live && l[0] && setCentre({ lat: l[0].lat, lng: l[0].lng }),
          );
      }
      setLoaded(true);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.eventId, event.teamId]);

  // Fonts and the logo mark.
  useEffect(() => {
    let live = true;
    Promise.all([loadPosterFonts(), loadPhotoStyleFonts()]).then(
      () => live && setFonts((n) => n + 1),
    );
    loadImage("/brand/wtf-mark.png")
      .then((m) => live && setMark(m))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  // Draw the graphic (the map loads tile by tile, then it's redrawn).
  const textKey = JSON.stringify(texts);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    let live = true;
    const draw = (map: HTMLCanvasElement | null) =>
      drawMeetingPoint(c, {
        size,
        map,
        t: { ...texts, where: texts.where || event.venue || "Find us here" },
        mark,
        look,
      });
    draw(null);
    if (spot) {
      const { w, h } = MEET_SIZES[size];
      const p = pinSpot(size);
      renderMap(spot.lat, spot.lng, zoom, w, h, p.x, p.y, look).then(
        (map) => live && draw(map),
      );
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot, zoom, look, size, textKey, mark, fonts]);

  // Keep the spot on the event (a moment after the last change).
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => {
      setSaved("saving");
      createClient()
        .rpc("set_meeting_point", {
          p_event_id: event.eventId,
          p_lat: spot?.lat ?? null,
          p_lng: spot?.lng ?? null,
          p_note: texts.where,
          p_zoom: spot ? zoom : null,
        })
        .then(({ data, error }) =>
          setSaved(!error && data ? "saved" : "failed"),
        );
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot, zoom, texts.where]);

  function pick(s: Spot) {
    dirty.current = true;
    setSpot(s);
  }

  async function search(q: string) {
    if (!q.trim()) return;
    setSearching(true);
    // A Google Maps link or "lat, lng": go straight to that spot.
    if (isMapsLink(q) || spotFromCoords(q)) {
      const s =
        spotFromCoords(q) ??
        (isShortMapsLink(q)
          ? await resolveMapsLink(q).catch(() => null)
          : spotFromMapsUrl(q));
      setSearching(false);
      if (!s) {
        setFound([]);
        return;
      }
      setCentre({ lat: s.lat, lng: s.lng });
      pick({ lat: s.lat, lng: s.lng });
      setFound(null);
      if (s.name && !texts.where) set("where", s.name);
      return;
    }
    const shown = await findPlaces(q, centre);
    setFound(shown);
    setSearching(false);
  }

  const blob = () =>
    new Promise<Blob | null>((resolve) =>
      canvas.current
        ? canvas.current.toBlob(resolve, "image/png")
        : resolve(null),
    );
  const fileName = `meeting-point-${event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${size}.png`;

  async function shareOrDownload() {
    const b = await blob();
    if (!b) return;
    const file = new File([b], fileName, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch {
        // Cancelled: fall through to nothing.
        return;
      }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function copyImage() {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob().then((b) => {
            if (!b) throw new Error("no image");
            return b;
          }),
        }),
      ]);
      setCopied("image");
    } catch {
      setCopied("");
    }
  }

  const caption = spot
    ? [
        `📍 Meeting point: ${texts.where || "see the map"}`,
        texts.when ? `${texts.what} · ${texts.when}` : texts.what,
        `Map: ${mapLink(spot)}`,
      ].join("\n")
    : "";

  const chip = (on: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
      on
        ? "bg-navy text-white ring-navy"
        : "bg-white text-navy ring-black/10 hover:bg-stone-50"
    }`;

  return (
    <Sheet title="Meeting point" onClose={onClose}>
      <p className="text-sm text-stone-600">
        Tap the map where people should meet, then say exactly where. You get a
        graphic for socials, and the spot is saved on this event.
      </p>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          search(query);
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search, or paste a Google Maps link"
          className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-xl bg-navy px-3 py-2 text-sm font-semibold text-white"
        >
          {searching ? "…" : "Find"}
        </button>
      </form>
      {found && (
        <ul className="mt-1 overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
          {found.length === 0 && (
            <li className="px-3 py-2 text-sm text-stone-500">
              Not found. Try the street address, or in Google Maps tap Share →
              Copy link and paste it here. You can also move the map yourself.
            </li>
          )}
          {found.map((f) => (
            <li key={`${f.lat},${f.lng}`}>
              <button
                type="button"
                onClick={() => {
                  setCentre({ lat: f.lat, lng: f.lng });
                  pick({ lat: f.lat, lng: f.lng });
                  setFound(null);
                }}
                className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-stone-50"
              >
                {f.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {earlier.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-stone-500">
            Spots used before
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {earlier.slice(0, 6).map((s) => (
              <button
                key={`${s.lat},${s.lng}`}
                type="button"
                title={s.event}
                onClick={() => {
                  setCentre({ lat: s.lat, lng: s.lng });
                  pick({ lat: s.lat, lng: s.lng });
                  if (s.zoom) setZoom(s.zoom);
                  if (s.note && !texts.where) set("where", s.note);
                }}
                className={chip(
                  !!spot &&
                    Math.abs(spot.lat - s.lat) < 1e-5 &&
                    Math.abs(spot.lng - s.lng) < 1e-5,
                )}
              >
                {s.note || s.event}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3">
        {loaded && centre ? (
          <MeetingPointMap
            centre={centre}
            spot={spot}
            zoom={zoom}
            look={look}
            onPick={pick}
            onZoom={(z) => setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)))}
          />
        ) : (
          <div className="h-64 animate-pulse rounded-xl bg-stone-100 sm:h-72" />
        )}
        <div className="mt-1 flex items-center justify-between text-xs text-stone-500">
          <span>
            {spot
              ? "Drag the pink dot to move it."
              : "Tap the map to drop the pin."}
          </span>
          <span aria-live="polite">
            {saved === "saving"
              ? "Saving…"
              : saved === "saved"
                ? "Saved on this event"
                : saved === "failed"
                  ? "Couldn't save the spot"
                  : ""}
          </span>
        </div>
      </div>

      <label className="mt-3 block text-sm font-medium text-navy">
        Exactly where?
        <input
          value={texts.where}
          maxLength={120}
          onChange={(e) => {
            dirty.current = true;
            set("where", e.target.value);
          }}
          placeholder="e.g. By the fountain, Town Hall steps"
          className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-normal"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {(Object.keys(MEET_SIZES) as MeetSize[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSize(s)}
            className={chip(size === s)}
          >
            {MEET_SIZES[s].label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-black/10" />
        {MAP_LOOKS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setLook(l.id)}
            className={chip(look === l.id)}
          >
            {l.label}
          </button>
        ))}
      </div>
      <label className="mt-3 flex items-center gap-3 text-xs font-medium text-stone-600">
        Closer
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={1}
          value={zoom}
          onChange={(e) => {
            dirty.current = true;
            setZoom(Number(e.target.value));
          }}
          className="flex-1 accent-pink [direction:rtl]"
          aria-label="How close in the map is"
        />
        Further out
      </label>

      <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-black/10">
        <canvas
          ref={canvas}
          className="block h-auto w-full"
          aria-label="Meeting point graphic"
        />
      </div>

      <details className="mt-3 rounded-xl bg-stone-50 px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-navy">
          Change the words
        </summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {(
            [
              ["kicker", "Small line at the top"],
              ["when", "Day and time"],
              ["what", "Event"],
              ["footer", "Bottom line"],
            ] as const
          ).map(([k, l]) => (
            <label key={k} className="block text-xs font-medium text-stone-600">
              {l}
              <input
                value={texts[k]}
                onChange={(e) => set(k, e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm font-normal text-navy"
              />
            </label>
          ))}
        </div>
        {Object.keys(edits).some((k) => k !== "where") && (
          <button
            type="button"
            onClick={() => setEdits((e) => ({ where: e.where }))}
            className="mt-2 text-xs font-medium text-stone-500 hover:text-navy"
          >
            Put the original words back
          </button>
        )}
      </details>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={shareOrDownload}
          disabled={!spot}
          className="flex-1 rounded-xl bg-pink px-4 py-2.5 font-semibold text-navy hover:bg-pink-strong disabled:opacity-50"
        >
          Share or download
        </button>
        <button
          type="button"
          onClick={copyImage}
          disabled={!spot}
          className="flex-1 rounded-xl bg-white px-4 py-2.5 font-semibold text-navy ring-1 ring-black/10 hover:bg-stone-50 disabled:opacity-50"
        >
          {copied === "image" ? "Copied" : "Copy image"}
        </button>
      </div>
      {spot && (
        <div className="mt-2 flex flex-wrap items-center justify-end gap-1">
          <button
            type="button"
            onClick={() =>
              navigator.clipboard
                .writeText(mapLink(spot))
                .then(() => setCopied("link"))
            }
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-stone-500 hover:text-stone-800"
          >
            {copied === "link" ? "Map link copied" : "Copy map link"}
          </button>
          <SaveToPlanner
            teamId={event.teamId}
            eventId={event.eventId}
            day={planDay}
            tz={tz}
            note={`Meeting point: ${event.title}`}
            caption={caption}
            platforms={size === "story" ? ["story"] : ["instagram"]}
            getImage={blob}
          />
        </div>
      )}
    </Sheet>
  );
}
