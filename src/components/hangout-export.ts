import {
  SH,
  SW,
  drawBackground,
  drawDecor,
  drawHangoutSlide,
  layoutSlide,
} from "@/components/hangout-slide";
import type { DeckSlide } from "@/lib/hangouts";

// Downloads for a planned hangout: a PowerPoint with speaker notes (real,
// editable text on the Hub's background) and a PDF of the slides.

type Opts = { region: string; mark: HTMLImageElement | null };

const NAVY_RGB = [7, 17, 48];

// PowerPoint text has no see-through colours: mix rgba() onto the navy.
function solid(colour: string) {
  const m = colour.match(/rgba?\(([^)]+)\)/);
  if (!m) return colour.replace("#", "").toUpperCase();
  const [r, g, b, a = 1] = m[1].split(",").map((x) => Number(x.trim()));
  const mix = (c: number, n: number) => Math.round(c * a + n * (1 - a));
  return [mix(r, NAVY_RGB[0]), mix(g, NAVY_RGB[1]), mix(b, NAVY_RGB[2])]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export function fileBase(title: string, heldOn: string | null) {
  const name = `${title || "Organiser hangout"}${heldOn ? ` ${heldOn}` : ""}`;
  return name
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export async function downloadPptx(
  slides: DeckSlide[],
  o: Opts & { title: string; heldOn: string | null },
) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 × 7.5 in = 1920 × 1080 at 144 px/in
  pptx.title = o.title;
  pptx.company = "We The Free";
  const IN = 144;
  const canvas = document.createElement("canvas");
  canvas.width = SW;
  canvas.height = SH;
  const ctx = canvas.getContext("2d")!;
  slides.forEach((s, i) => {
    const l = layoutSlide(ctx, s, {
      index: i,
      total: slides.length,
      region: o.region,
    });
    drawBackground(ctx, l.accent, o.mark);
    drawDecor(ctx, l);
    const slide = pptx.addSlide();
    slide.background = {
      data: canvas.toDataURL("image/jpeg", 0.9).replace(/^data:/, ""),
    };
    for (const b of l.boxes) {
      slide.addText(b.lines.join(" "), {
        x: b.x / IN,
        y: b.y / IN,
        w: b.w / IN,
        h: (b.lines.length * b.lineH + 8) / IN,
        fontFace: b.display ? "Arial Black" : "Arial",
        fontSize: b.size / 2,
        bold: !b.display && !!b.bold,
        color: solid(b.colour),
        align: b.align ?? "left",
        valign: "top",
        margin: 0,
        lineSpacing: b.lineH / 2,
        charSpacing: b.spacing ? b.spacing / 2 : undefined,
        fit: "shrink",
      });
    }
    if (s.notes) slide.addNotes(s.notes);
  });
  await pptx.writeFile({
    fileName: `${fileBase(o.title, o.heldOn)}.pptx`,
  });
}

export async function downloadPdf(
  slides: DeckSlide[],
  o: Opts & { title: string; heldOn: string | null },
) {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle(o.title);
  const canvas = document.createElement("canvas");
  for (let i = 0; i < slides.length; i++) {
    drawHangoutSlide(canvas, slides[i], {
      index: i,
      total: slides.length,
      region: o.region,
      mark: o.mark,
    });
    const jpg = await pdf.embedJpg(canvas.toDataURL("image/jpeg", 0.9));
    const page = pdf.addPage([SW / 2, SH / 2]);
    page.drawImage(jpg, { x: 0, y: 0, width: SW / 2, height: SH / 2 });
  }
  const bytes = await pdf.save();
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${fileBase(o.title, o.heldOn)}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// Plain text run sheet (speaker notes), for copying.
export function notesText(slides: DeckSlide[]) {
  return slides
    .map((s, i) => `${i + 1}. ${s.heading}${s.notes ? `\n${s.notes}` : ""}`)
    .join("\n\n");
}
