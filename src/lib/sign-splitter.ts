// Sign splitter: print a big sign (e.g. A1) on A4 or A3 sheets at home.
// Each sheet keeps a small margin (most printers can't print to the edge)
// and overlaps its neighbours, with tick marks to line them up.
import {
  PDFDocument,
  StandardFonts,
  clip,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  type PDFPage,
} from "pdf-lib";

export const PAPERS = {
  A4: [210, 297],
  A3: [297, 420],
} as const;
export type Paper = keyof typeof PAPERS;

// Finished sign sizes (short side × long side, mm). "design" = as designed.
export const SIGN_SIZES = {
  A0: [841, 1189],
  A1: [594, 841],
  A2: [420, 594],
  A3: [297, 420],
} as const;
export type SignSize = keyof typeof SIGN_SIZES | "design";

const MARGIN = 6; // unprintable edge, mm
const OVERLAP = 10; // each sheet overlaps the next, mm
const PT = 72 / 25.4; // points per mm
// Rendered from the SignSteps component (src/components/sign-steps.tsx);
// re-render it when the steps change.
const HOW_TO = "/resources/signs/how-to.png";
const HOW_TO_BANNER = "/resources/signs/how-to-banner.png"; // <SignSteps printable banner />

export type Layout = {
  paperW: number; // sheet size, mm
  paperH: number;
  cols: number;
  rows: number;
  scale: number; // 1 = the size asked for
  signW: number; // printed sign size, mm
  signH: number;
};

// Sign size in mm: the design's own size, or the chosen size in the
// design's orientation (keeping its shape).
export function signSize(designW: number, designH: number, size: SignSize) {
  if (size === "design") return [designW, designH] as const;
  const [s, l] = SIGN_SIZES[size];
  const [bw, bh] = designW >= designH ? [l, s] : [s, l];
  const k = Math.min(bw / designW, bh / designH);
  return [designW * k, designH * k] as const;
}

function grid(W: number, H: number, pw: number, ph: number) {
  const iw = pw - 2 * MARGIN;
  const ih = ph - 2 * MARGIN;
  const cols = Math.max(1, Math.ceil((W - OVERLAP) / (iw - OVERLAP)));
  const rows = Math.max(1, Math.ceil((H - OVERLAP) / (ih - OVERLAP)));
  return { cols, rows, iw, ih };
}

// Two choices: exact size (as many sheets as it takes), and the fewest sheets
// that would fit it with no margins, printed a touch smaller.
export function layouts(W: number, H: number, paper: Paper) {
  const [a, b] = PAPERS[paper];
  const orients = [
    [a, b],
    [b, a],
  ];
  let exact: Layout | null = null;
  let fit: Layout | null = null;
  for (const [pw, ph] of orients) {
    const g = grid(W, H, pw, ph);
    const e: Layout = {
      paperW: pw,
      paperH: ph,
      cols: g.cols,
      rows: g.rows,
      scale: 1,
      signW: W,
      signH: H,
    };
    if (!exact || e.cols * e.rows < exact.cols * exact.rows) exact = e;
    // Fewest sheets if there were no margins, then shrink to fit them.
    const c0 = Math.max(1, Math.ceil(W / pw - 0.02));
    const r0 = Math.max(1, Math.ceil(H / ph - 0.02));
    const s = Math.min(
      1,
      (c0 * (g.iw - OVERLAP) + OVERLAP) / W,
      (r0 * (g.ih - OVERLAP) + OVERLAP) / H,
    );
    const f: Layout = {
      paperW: pw,
      paperH: ph,
      cols: c0,
      rows: r0,
      scale: s,
      signW: W * s,
      signH: H * s,
    };
    if (!fit || f.cols * f.rows < fit.cols * fit.rows) fit = f;
  }
  return {
    exact: exact!,
    fit: fit && fit.cols * fit.rows < exact!.cols * exact!.rows ? fit : null,
  };
}

// Sheets are numbered 1, 2, 3… across then down (not A1/B2, which read like paper sizes).
export const tileName = (r: number, c: number, cols: number) =>
  `${r * cols + c + 1}`;

// Backing boards come no bigger than A2, so a banner is backed in pieces:
// groups of whole sheets that each fit on an A2 board (either way round).
export const BOARD = [594, 420] as const; // A2, mm
export type Boards = {
  cols: number[]; // sheets per board, across
  rows: number[]; // sheets per board, down
  count: number; // pieces
  halves: number; // pieces small enough for half a board (A3 size)
  half: boolean[]; // per piece (across then down): only needs half a board
  buy: number; // A2 boards to buy: half pieces share a board
};
const split = (n: number, most: number) => {
  const parts = Math.ceil(n / most);
  const base = Math.floor(n / parts);
  return Array.from({ length: parts }, (_, i) =>
    i < n - base * parts ? base + 1 : base,
  );
};
export function boardGroups(l: Layout): Boards {
  const iw = l.paperW - 2 * MARGIN;
  const ih = l.paperH - 2 * MARGIN;
  const fits = (n: number, step: number, max: number) =>
    n * (step - OVERLAP) + OVERLAP <= max;
  let best: Boards | null = null;
  for (const [bw, bh] of [BOARD, [BOARD[1], BOARD[0]]]) {
    let gc = 1;
    while (gc < l.cols && fits(gc + 1, iw, bw)) gc++;
    let gr = 1;
    while (gr < l.rows && fits(gr + 1, ih, bh)) gr++;
    const cols = split(l.cols, gc);
    const rows = split(l.rows, gr);
    // A piece that fits half an A2 board (297 × 420, either way) can share
    // a cut-in-half board with another one.
    const span = (n: number, step: number) => n * (step - OVERLAP) + OVERLAP;
    const half: boolean[] = [];
    for (const nr of rows)
      for (const nc of cols) {
        const w = span(nc, iw);
        const h = span(nr, ih);
        half.push((w <= 297 && h <= 420) || (w <= 420 && h <= 297));
      }
    const halves = half.filter(Boolean).length;
    const count = cols.length * rows.length;
    const buy = count - halves + Math.ceil(halves / 2);
    const b = { cols, rows, count, halves, half, buy };
    if (
      !best ||
      b.buy < best.buy ||
      (b.buy === best.buy && b.count < best.count)
    )
      best = b;
  }
  return best!;
}
// Which board a sheet is on (1-based, across then down).
export function boardOf(b: Boards, r: number, c: number) {
  const at = (sizes: number[], i: number) => {
    let k = 0;
    while (i >= sizes[k]) i -= sizes[k++];
    return k;
  };
  return at(b.rows, r) * b.cols.length + at(b.cols, c) + 1;
}

// Where each sheet's printed area sits on the sign (mm from top-left).
function tileRect(l: Layout, r: number, c: number) {
  const iw = l.paperW - 2 * MARGIN;
  const ih = l.paperH - 2 * MARGIN;
  const coverW = l.cols * (iw - OVERLAP) + OVERLAP;
  const coverH = l.rows * (ih - OVERLAP) + OVERLAP;
  const ox = (coverW - l.signW) / 2;
  const oy = (coverH - l.signH) / 2;
  return { x: c * (iw - OVERLAP) - ox, y: r * (ih - OVERLAP) - oy, iw, ih };
}

// The design as a PDF: a PDF as it is, or an image placed on a page.
export async function sourceFromFile(file: File): Promise<PDFDocument> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name))
    return PDFDocument.load(bytes);
  const doc = await PDFDocument.create();
  const img = /png$/i.test(file.type)
    ? await doc.embedPng(bytes)
    : await doc.embedJpg(bytes);
  const page = doc.addPage([img.width, img.height]);
  page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  return doc;
}

export async function splitSign(
  src: PDFDocument,
  pages: number[], // which designs (page indexes)
  size: SignSize,
  paper: Paper,
  mode: "exact" | "fit",
  names: string[] = [],
  boards = false, // a banner: backed in A2 pieces
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);
  const bold = await out.embedFont(StandardFonts.HelveticaBold);
  const grey = rgb(0.55, 0.55, 0.6);

  for (const pi of pages) {
    const sp = src.getPage(pi);
    const { width: sw, height: sh } = sp.getSize(); // pt
    const [W, H] = signSize(sw / PT, sh / PT, size);
    const opts = layouts(W, H, paper);
    const l = mode === "fit" && opts.fit ? opts.fit : opts.exact;
    const k = l.signW / (sw / PT); // design mm -> printed mm
    const name = names[pi] ?? `Design ${pi + 1}`;

    // Guide page: the whole sign with the sheets drawn over it.
    const gp = out.addPage([297 * PT, 210 * PT]);
    const gw = 297 * PT - 40 * PT;
    const ghMax = 210 * PT - 70 * PT;
    const gk = Math.min(gw / sw, ghMax / sh);
    const gx = (297 * PT - sw * gk) / 2;
    const gy = 22 * PT;
    const whole = await out.embedPage(sp);
    gp.drawPage(whole, { x: gx, y: gy, xScale: gk, yScale: gk });
    const toG = (mmX: number, mmY: number) => ({
      x: gx + (mmX / k) * PT * gk,
      y: gy + sh * gk - (mmY / k) * PT * gk,
    });
    for (let r = 0; r < l.rows; r++)
      for (let c = 0; c < l.cols; c++) {
        const t = tileRect(l, r, c);
        // Each sheet's own part: up to the middle of the overlaps.
        const x0 = c === 0 ? 0 : t.x + OVERLAP / 2;
        const y0 = r === 0 ? 0 : t.y + OVERLAP / 2;
        const x1 = c === l.cols - 1 ? l.signW : t.x + t.iw - OVERLAP / 2;
        const y1 = r === l.rows - 1 ? l.signH : t.y + t.ih - OVERLAP / 2;
        const a = toG(x0, y1);
        const b = toG(x1, y0);
        gp.drawRectangle({
          x: a.x,
          y: a.y,
          width: b.x - a.x,
          height: b.y - a.y,
          borderColor: rgb(1, 1, 1),
          borderWidth: 1,
          borderDashArray: [4, 3],
        });
        const label = tileName(r, c, l.cols);
        gp.drawText(label, {
          x: (a.x + b.x) / 2 - bold.widthOfTextAtSize(label, 14) / 2,
          y: (a.y + b.y) / 2 - 5,
          size: 14,
          font: bold,
          color: rgb(1, 1, 1),
        });
      }
    const bg = boards ? boardGroups(l) : null;
    if (bg) {
      // Thick yellow outline around each A2 board's sheets.
      let y0 = 0;
      let r0 = 0;
      bg.rows.forEach((nr, bi) => {
        let x0 = 0;
        let c0 = 0;
        const y1 =
          r0 + nr === l.rows
            ? l.signH
            : tileRect(l, r0 + nr - 1, 0).y +
              tileRect(l, 0, 0).ih -
              OVERLAP / 2;
        bg.cols.forEach((nc, bj) => {
          const x1 =
            c0 + nc === l.cols
              ? l.signW
              : tileRect(l, 0, c0 + nc - 1).x +
                tileRect(l, 0, 0).iw -
                OVERLAP / 2;
          const a = toG(x0, y1);
          const b = toG(x1, y0);
          gp.drawRectangle({
            x: a.x + 1.5,
            y: a.y + 1.5,
            width: b.x - a.x - 3,
            height: b.y - a.y - 3,
            borderColor: rgb(1, 0.85, 0.06),
            borderWidth: 3,
          });
          const pi = bi * bg.cols.length + bj;
          const label = `Board ${pi + 1}${bg.half[pi] ? " (half)" : ""}`;
          gp.drawText(label, {
            x: a.x + 6,
            y: a.y + 6,
            size: 9,
            font: bold,
            color: rgb(1, 0.85, 0.06),
          });
          x0 = x1;
          c0 += nc;
        });
        y0 = y1;
        r0 += nr;
      });
    }
    const title = `${name}: ${Math.round(l.signW)} × ${Math.round(l.signH)} mm on ${l.cols * l.rows} ${paper} sheets (${l.paperW > l.paperH ? "landscape" : "portrait"})${bg ? `, ${bg.count} A2 boards` : ""}`;
    gp.drawText(title, {
      x: 20 * PT,
      y: 210 * PT - 18 * PT,
      size: 13,
      font: bold,
    });
    gp.drawText(
      bg
        ? "Print at Actual size (100%), not Fit to page. Lay the sheets out like this grid; each sheet's name is on its bottom edge. Backing boards are A2 at most, so join and back the sheets in the yellow pieces, one board each, then line the boards up along the table. Step-by-step pictures are on the last page."
        : "Print at Actual size (100%), not Fit to page. Lay the sheets out like this grid; each sheet's name is on its bottom edge. Step-by-step pictures are on the last page.",
      {
        x: 20 * PT,
        y: 210 * PT - 28 * PT,
        size: 8.5,
        font,
        color: grey,
        maxWidth: 257 * PT,
        lineHeight: 11,
      },
    );

    // The sheets.
    const tick = (p: PDFPage, x1: number, y1: number, x2: number, y2: number) =>
      p.drawLine({
        start: { x: x1 * PT, y: y1 * PT },
        end: { x: x2 * PT, y: y2 * PT },
        thickness: 0.6,
        color: grey,
      });
    for (let r = 0; r < l.rows; r++)
      for (let c = 0; c < l.cols; c++) {
        const t = tileRect(l, r, c);
        const page = out.addPage([l.paperW * PT, l.paperH * PT]);
        // The part of the design this sheet shows (design points, PDF y-up):
        // the whole design (embedded once, so big designs don't make huge
        // PDFs), shifted and clipped to the sheet's printable area.
        const left = (t.x / k) * PT;
        const bottom = sh - ((t.y + t.ih) / k) * PT;
        page.pushOperators(
          pushGraphicsState(),
          rectangle(MARGIN * PT, MARGIN * PT, t.iw * PT, t.ih * PT),
          clip(),
          endPath(),
        );
        page.drawPage(whole, {
          x: MARGIN * PT - left * k,
          y: MARGIN * PT - bottom * k,
          xScale: k,
          yScale: k,
        });
        page.pushOperators(popGraphicsState());
        // Tick marks in the margins where the neighbouring sheets overlap.
        const pw = l.paperW;
        const ph = l.paperH;
        const ticks: number[] = [];
        if (c > 0) ticks.push(MARGIN + OVERLAP);
        if (c < l.cols - 1) ticks.push(pw - MARGIN - OVERLAP);
        for (const x of ticks) {
          tick(page, x, 0.5, x, MARGIN - 1);
          tick(page, x, ph - MARGIN + 1, x, ph - 0.5);
        }
        const vt: number[] = [];
        if (r > 0) vt.push(ph - MARGIN - OVERLAP);
        if (r < l.rows - 1) vt.push(MARGIN + OVERLAP);
        for (const y of vt) {
          tick(page, 0.5, y, MARGIN - 1, y);
          tick(page, pw - MARGIN + 1, y, pw - 0.5, y);
        }
        page.drawText(
          `Sheet ${tileName(r, c, l.cols)} of ${l.cols * l.rows}${bg ? `  ·  Board ${boardOf(bg, r, c)}` : ""}  ·  row ${r + 1}, column ${c + 1}  ·  ${name}`,
          { x: MARGIN * PT + 14, y: 3.8 * PT, size: 6, font, color: grey },
        );
      }
  }

  // Last page: the step-by-step pictures (same as on the sign splitter page).
  try {
    const png = await (
      await fetch(boards ? HOW_TO_BANNER : HOW_TO)
    ).arrayBuffer();
    const img = await out.embedPng(png);
    const pw = 297 * PT;
    const ph = 210 * PT;
    const page = out.addPage([pw, ph]);
    const k = Math.min((pw - 24 * PT) / img.width, (ph - 24 * PT) / img.height);
    page.drawImage(img, {
      x: (pw - img.width * k) / 2,
      y: (ph - img.height * k) / 2,
      width: img.width * k,
      height: img.height * k,
    });
  } catch {
    // No pictures (offline?): the guide page still has the short version.
  }
  return out.save();
}
