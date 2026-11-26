// An event's main promo poster (Kai, 26 Nov 2026: "Always put the main promo
// poster at the end of the carousel"). The same style the graphic maker
// opens on for that event: synthwave for New Year's Eve, Christmas,
// dinner in the park, else the "Coming soon" poster. No photo, so it can be
// drawn straight away; post size (1080×1350).
import type { PhotoStyleEvent } from "@/components/graphic-photo-styles";
import {
  drawSynthwave,
  isNewYear,
  loadSynthwaveFonts,
  synthwaveFields,
} from "@/components/graphic-synthwave";
import {
  christmasFields,
  drawChristmas,
  isChristmas,
  loadChristmasFonts,
} from "@/components/graphic-christmas";
import {
  drawPark,
  isPark,
  loadParkFonts,
  parkFields,
} from "@/components/graphic-park";
import {
  drawTeaser,
  loadTeaserFonts,
  teaserFields,
} from "@/components/graphic-teaser";

type Kind = "synthwave" | "christmas" | "park" | "teaser";

const kindOf = (title: string): Kind =>
  isNewYear(title)
    ? "synthwave"
    : isChristmas(title)
      ? "christmas"
      : isPark(title)
        ? "park"
        : "teaser";

export function loadMainPosterFonts(title: string) {
  const k = kindOf(title);
  return (
    k === "synthwave"
      ? loadSynthwaveFonts()
      : k === "christmas"
        ? loadChristmasFonts()
        : k === "park"
          ? loadParkFonts()
          : loadTeaserFonts()
  ) as Promise<void> | null;
}

const texts = (fields: { key: string; value: string }[]) =>
  Object.fromEntries(fields.map((f) => [f.key, f.value]));

export function drawMainPoster(
  canvas: HTMLCanvasElement,
  e: PhotoStyleEvent,
  tz: string,
  handle: string | null,
  mark: HTMLImageElement | null,
  w = 1080,
  h = 1350,
) {
  const k = kindOf(e.title);
  if (k === "synthwave")
    drawSynthwave(canvas, {
      w,
      h,
      t: texts(synthwaveFields(e, tz, false, handle)),
      mark,
      photo: null,
    });
  else if (k === "christmas")
    drawChristmas(canvas, {
      w,
      h,
      t: texts(christmasFields(e, tz, false, handle)),
      mark,
      photo: null,
      shape: "none",
    });
  else if (k === "park")
    drawPark(canvas, {
      w,
      h,
      t: texts(parkFields(e, tz, false, handle)),
      mark,
      photo: null,
      shape: "none",
    });
  else
    drawTeaser(canvas, {
      w,
      h,
      t: texts(teaserFields(e, tz, false)),
      colours: "warm",
      mark,
    });
}
