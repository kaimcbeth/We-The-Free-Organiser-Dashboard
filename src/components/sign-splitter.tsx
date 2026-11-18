"use client";

import { useEffect, useState } from "react";
import type { PDFDocument } from "pdf-lib";
import {
  PAPERS,
  layouts,
  signSize,
  splitSign,
  sourceFromFile,
  tileName,
  boardGroups,
  type Boards,
  type Layout,
  type Paper,
  type SignSize,
} from "@/lib/sign-splitter";
import { SignSteps } from "@/components/sign-steps";

// Signs ready to go (files in public/resources/signs).
const BUILT_IN = [
  {
    id: "3mmc",
    label: "3 Minute Movie Challenge (landscape)",
    file: "/resources/signs/3mmc-landscape-a1.pdf",
    designs: ["Arrow right", "Arrow left"],
    previews: [
      "/resources/signs/3mmc-landscape-1.png",
      "/resources/signs/3mmc-landscape-2.png",
    ],
  },
  {
    // Kai's Canva design for the front of a 6ft table (1830 × 750 mm).
    id: "table-banner",
    label: "Table banner (6ft table)",
    file: "/resources/signs/table-banner.pdf",
    designs: ["Table banner"],
    previews: ["/resources/signs/table-banner.png"],
    fixedSize: true, // printed as designed (fits the table)
  },
  {
    // Kai's "FREE SNACK" design for the front of the Kings roll-up table
    // (the Best table in the equipment guide; 1400 × 710 mm).
    id: "table-banner-kings",
    label: "Table banner (Kings roll-up table)",
    file: "/resources/signs/table-banner-kings.pdf",
    designs: ["Free snack"],
    previews: ["/resources/signs/table-banner-kings-1.png"],
    fixedSize: true,
  },
] as {
  id: string;
  label: string;
  file: string;
  designs: string[];
  previews: string[];
  fixedSize?: boolean;
}[];

type Source = {
  doc: PDFDocument;
  name: string;
  designs: string[];
  previews: (string | null)[];
  sizes: { w: number; h: number }[]; // mm
  fixedSize?: boolean; // only "As designed" (e.g. the table banner)
};

const MM = 25.4 / 72;
const sizeLabel = (w: number, h: number) =>
  `${Math.round(w)} × ${Math.round(h)} mm`;

export function SignSplitter() {
  const [source, setSource] = useState<Source | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set([0]));
  // DIY signs are A2 (Kai, 18 Nov 2026: bigger ones flop on card).
  const [chosenSize, setSize] = useState<SignSize>("A2");
  const [paper, setPaper] = useState<Paper>("A3");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load(
    doc: PDFDocument,
    name: string,
    designs?: string[],
    previews?: (string | null)[],
  ) {
    const pages = doc.getPages();
    setSource({
      doc,
      name,
      designs: pages.map((_, i) => designs?.[i] ?? `Page ${i + 1}`),
      previews: pages.map((_, i) => previews?.[i] ?? null),
      sizes: pages.map((p) => ({
        w: p.getWidth() * MM,
        h: p.getHeight() * MM,
      })),
    });
    setPicked(new Set(pages.map((_, i) => i)));
  }

  async function pickBuiltIn(b: (typeof BUILT_IN)[number]) {
    setError("");
    const { PDFDocument } = await import("pdf-lib");
    const bytes = await (await fetch(b.file)).arrayBuffer();
    await load(await PDFDocument.load(bytes), b.label, b.designs, b.previews);
    if (b.fixedSize) {
      setSource((s) => s && { ...s, fixedSize: true });
      setPicked(new Set([0])); // a table takes one banner: start with the first
    }
  }

  useEffect(() => {
    // Start with a built-in sign ready to go: ?sign=table-banner picks that
    // one (from the equipment guide), otherwise the first.
    void (async () => {
      const wanted = new URLSearchParams(window.location.search).get("sign");
      const b = BUILT_IN.find((x) => x.id === wanted) ?? BUILT_IN[0];
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await (await fetch(b.file)).arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const pages = doc.getPages();
      setSource({
        doc,
        name: b.label,
        designs: b.designs,
        previews: b.previews,
        fixedSize: b.fixedSize,
        sizes: pages.map((p) => ({
          w: p.getWidth() * MM,
          h: p.getHeight() * MM,
        })),
      });
      setPicked(new Set(b.fixedSize ? [0] : pages.map((_, i) => i)));
    })();
  }, []);

  async function upload(file: File) {
    setError("");
    try {
      const doc = await sourceFromFile(file);
      const preview = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null;
      await load(doc, file.name.replace(/\.[^.]+$/, ""), undefined, [preview]);
    } catch {
      setError("Couldn't read that file. Try a PDF, PNG or JPG.");
    }
  }

  const size: SignSize = source?.fixedSize ? "design" : chosenSize;
  // One sheet option only (Kai, 18 Nov 2026): table banners print at exact
  // size (whole boards, no cutting); signs slightly smaller (fewer sheets,
  // sits on its board with a thin border).
  const mode: "exact" | "fit" = source?.fixedSize ? "exact" : "fit";
  const first = source?.sizes[[...picked][0] ?? 0] ?? source?.sizes[0];
  const [W, H] = first ? signSize(first.w, first.h, size) : [0, 0];
  const opts = first ? layouts(W, H, paper) : null;
  const layout: Layout | null = opts
    ? mode === "fit" && opts.fit
      ? opts.fit
      : opts.exact
    : null;

  async function download() {
    if (!source || picked.size === 0) return;
    setBusy(true);
    setError("");
    try {
      const bytes = await splitSign(
        source.doc,
        [...picked].sort(),
        size,
        paper,
        mode,
        source.designs,
        !!source.fixedSize,
      );
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${source.name} - ${paper} sheets.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    } catch {
      setError("Couldn't make the PDF. Try again?");
    }
    setBusy(false);
  }

  const chip = (on: boolean) =>
    `rounded-full px-3 py-1 text-sm font-medium ring-1 ${on ? "bg-navy text-white ring-navy" : "bg-white text-stone-600 ring-stone-300"}`;

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Sign</h2>
        <div className="flex flex-wrap items-center gap-2">
          {BUILT_IN.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => pickBuiltIn(b)}
              className={chip(source?.name === b.label)}
            >
              {b.label}
            </button>
          ))}
          <label className="cursor-pointer text-sm text-stone-500 hover:text-navy hover:underline">
            Upload your own (PDF, PNG or JPG)
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </label>
        </div>
        {source && (
          <div className="flex flex-wrap gap-3">
            {source.designs.map((d, i) => (
              <label
                key={i}
                className={`w-48 cursor-pointer overflow-hidden rounded-xl bg-white text-xs ring-2 ${picked.has(i) ? "ring-pink" : "ring-black/5"}`}
              >
                {source.previews[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local preview
                  <img
                    src={source.previews[i]!}
                    alt=""
                    className="aspect-[1.414] w-full bg-stone-100 object-contain"
                  />
                ) : (
                  <span className="flex aspect-[1.414] items-center justify-center bg-stone-100 text-stone-400">
                    {d}
                  </span>
                )}
                <span className="flex items-center gap-1.5 px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={picked.has(i)}
                    onChange={() => {
                      const n = new Set(picked);
                      if (n.has(i)) n.delete(i);
                      else n.add(i);
                      setPicked(n);
                    }}
                  />
                  {d}
                  <span className="ml-auto text-stone-400">
                    {sizeLabel(source.sizes[i].w, source.sizes[i].h)}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </section>

      {!source?.fixedSize && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Printed size</h2>
          <div className="flex flex-wrap gap-1.5">
            {(["A2", "A1"] as SignSize[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={chip(size === s)}
              >
                {s === "design"
                  ? "As designed"
                  : s === "A2"
                    ? "A2 (recommended)"
                    : s}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Print on</h2>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(PAPERS) as Paper[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPaper(p)}
              className={chip(paper === p)}
            >
              {p} paper{p === "A3" ? " (recommended)" : ""}
            </button>
          ))}
        </div>
        <p className="text-xs text-stone-600">
          <b>Thin, plain paper is fine.</b> Print in colour on everyday 80 gsm
          paper (Officeworks self-serve: ${PRINT_PRICE.A3.toFixed(2)} an A3, $
          {PRINT_PRICE.A4.toFixed(2)} an A4). The backing board (or card, for
          table banners) is what makes it stiff, so you don&apos;t need thick or
          photo paper.
        </p>
      </section>

      {opts && layout && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Sheets</h2>
          <p className="text-sm text-stone-700">
            {layout.cols * layout.rows} sheets ·{" "}
            {sizeLabel(layout.signW, layout.signH)}
            {layout.scale < 0.995
              ? ` (${Math.round(layout.scale * 100)}%, leaving room for the printer's edge)`
              : ""}
          </p>
          <Preview
            boards={source?.fixedSize ? boardGroups(layout) : null}
            layout={layout}
            image={source?.previews[[...picked][0] ?? 0] ?? null}
          />
        </section>
      )}

      <button
        type="button"
        onClick={download}
        disabled={busy || !source || picked.size === 0}
        className="w-full rounded-xl bg-pink px-4 py-3 font-semibold text-navy hover:bg-pink-strong disabled:opacity-60"
      >
        {busy
          ? "Making the PDF…"
          : `Download PDF${picked.size > 1 ? ` (${picked.size} designs)` : ""}`}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <p className="text-xs text-stone-500">
        The PDF starts with a guide showing where each sheet goes and ends with
        these steps, so you can follow along while you put it together.
      </p>
      <SignSteps banner={!!source?.fixedSize} />
    </div>
  );
}

// The sign with the sheet grid over it.
function Preview({
  layout: l,
  image,
  boards,
}: {
  layout: Layout;
  image: string | null;
  boards: Boards | null;
}) {
  return (
    <>
      <div
        className="relative w-full max-w-md overflow-hidden rounded-lg bg-stone-200"
        style={{ aspectRatio: `${l.signW} / ${l.signH}` }}
      >
        {image && (
          // eslint-disable-next-line @next/next/no-img-element -- local preview
          <img src={image} alt="" className="absolute inset-0 h-full w-full" />
        )}
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${l.cols}, 1fr)`,
            gridTemplateRows: `repeat(${l.rows}, 1fr)`,
          }}
        >
          {Array.from({ length: l.cols * l.rows }, (_, i) => (
            <span
              key={i}
              className="flex items-center justify-center border border-dashed border-white/80 text-sm font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]"
            >
              {tileName(Math.floor(i / l.cols), i % l.cols, l.cols)}
            </span>
          ))}
        </div>
        {boards && (
          <div
            className="pointer-events-none absolute inset-0 grid"
            style={{
              gridTemplateColumns: boards.cols.map((n) => `${n}fr`).join(" "),
              gridTemplateRows: boards.rows.map((n) => `${n}fr`).join(" "),
            }}
          >
            {Array.from({ length: boards.count }, (_, i) => (
              <span
                key={i}
                className="relative m-0.5 rounded-sm border-[3px] border-yellow"
              >
                <span className="absolute top-0.5 left-1.5 text-[11px] font-bold text-yellow [text-shadow:0_1px_2px_rgba(0,0,0,0.7)]">
                  Board {boards.label[i]}
                  {boards.half[i] ? " (half)" : ""}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
      <ShoppingList layout={l} boards={boards} />
    </>
  );
}

// The backing card Kai recommends for table banners (Officeworks, 18 Nov 2026).
const BACKING = {
  name: "Liviano A2 Colour Card 180gsm, black",
  shop: "Officeworks",
  url: "https://www.officeworks.com.au/shop/officeworks/p/liviano-a2-colour-card-180gsm-black-ja0419890",
  price: 2.2,
};

// Handheld (A2) signs: 5 mm foam board stays stiff (Kai, 18 Nov 2026).
const FOAM_BOARD =
  "https://www.officeworks.com.au/shop/officeworks/p/a2-foam-board-5mm-black-5-pack-ljpcfba2b5";
const FOAM_BOARD_A1 =
  "https://www.officeworks.com.au/shop/officeworks/p/a1-foam-board-5mm-black-ljpcfba1bk";

// Officeworks self-serve colour prints on 80 gsm paper (checked 18 Nov 2026).
const PRINT_PRICE: Record<Paper, number> = { A3: 0.98, A4: 0.49 };
const money = (n: number) => `$${n % 1 ? n.toFixed(2) : n.toFixed(0)}`;

function ShoppingList({
  layout: l,
  boards,
}: {
  layout: Layout;
  boards: Boards | null;
}) {
  const paper: Paper = Math.min(l.paperW, l.paperH) >= 290 ? "A3" : "A4";
  const sheets = l.cols * l.rows;
  const print = sheets * PRINT_PRICE[paper];
  if (!boards) {
    const a2 =
      Math.max(l.signW, l.signH) <= 594 && Math.min(l.signW, l.signH) <= 420;
    const board = a2
      ? {
          name: "Black A2 foam board, 5 mm",
          price: 5,
          where: "about $5 each in a 5-pack at Officeworks",
          url: FOAM_BOARD,
          note: "",
        }
      : {
          name: "A1 foam board, 5 mm",
          price: 12,
          where: "$12 at Officeworks",
          url: FOAM_BOARD_A1,
          note: " One piece, so there's no join. Not every Officeworks stocks the A1 board, so check your store has it before you go.",
        };
    // Double-sided, like the Best signs (Kai, 18 Nov 2026): one print of the
    // PDF for each face, same board.
    const both = sheets * 2;
    const prints = print * 2;
    return (
      <div className="rounded-xl bg-yellow/25 p-4 ring-1 ring-yellow">
        <p className="text-xs font-bold tracking-wide text-navy uppercase">
          What to buy · about {money(Math.ceil(prints + board.price))} a
          double-sided sign
        </p>
        <ul className="mt-2 space-y-2">
          <li>
            <p className="font-bold text-navy">
              {both} × {paper} colour prints on plain 80 gsm paper
            </p>
            <p className="text-sm text-stone-700">
              {money(PRINT_PRICE[paper])} each at Officeworks self-serve · about{" "}
              {money(Math.round(prints * 100) / 100)}. That&apos;s the PDF
              printed twice, one for each side ({sheets} for one side only).
              Thin paper is fine: the board backs it.
            </p>
          </li>
          <li>
            <p className="font-bold text-navy">1 × {board.name}</p>
            <p className="text-sm text-stone-700">{board.where}</p>
          </li>
        </ul>
        <p className="mt-2 text-xs text-stone-600">
          Or back it with a piece of cardboard box for free.{board.note}
        </p>
        <a
          href={board.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-2"
        >
          Buy the board at Officeworks ↗
        </a>
      </div>
    );
  }
  const n = boards.buy;
  const backing = n * BACKING.price;
  return (
    <div className="rounded-xl bg-yellow/25 p-4 ring-1 ring-yellow">
      <p className="text-xs font-bold tracking-wide text-navy uppercase">
        What to buy · about {money(Math.ceil(print + backing))}
      </p>
      <ul className="mt-2 space-y-2">
        <li>
          <p className="font-bold text-navy">
            {sheets} × {paper} colour prints on plain 80 gsm paper
          </p>
          <p className="text-sm text-stone-700">
            {money(PRINT_PRICE[paper])} each at Officeworks self-serve · about{" "}
            {money(Math.round(print * 100) / 100)}. Thin paper is fine: the card
            backs it.
          </p>
        </li>
        <li>
          <p className="font-bold text-navy">
            {n} × {BACKING.name}
          </p>
          <p className="text-sm text-stone-700">
            {money(BACKING.price)} each at {BACKING.shop} · about{" "}
            {money(backing)}
          </p>
        </li>
      </ul>
      <p className="mt-2 text-xs text-stone-600">
        Each card is A2 (594 × 420 mm), the biggest it comes, so the banner is
        backed in the pieces outlined in yellow.
        {boards.halves > 0 &&
          " Pieces marked (half) only need half a card: cut one card in half and use it for both pieces with that board number."}{" "}
        Thin 180 gsm card is enough because the table holds it up. It rolls up
        for carrying, and black hides any gaps between pieces.
      </p>
      <a
        href={BACKING.url}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-2"
      >
        Buy the card at {BACKING.shop} ↗
      </a>
    </div>
  );
}
