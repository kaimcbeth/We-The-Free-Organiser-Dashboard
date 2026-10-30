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
  type Layout,
  type Paper,
  type SignSize,
} from "@/lib/sign-splitter";

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
    label: "Table banner",
    file: "/resources/signs/table-banner.pdf",
    designs: ["Table banner"],
    previews: ["/resources/signs/table-banner.png"],
    fixedSize: true, // printed as designed (fits the table)
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
  const [size, setSize] = useState<SignSize>("design");
  const [paper, setPaper] = useState<Paper>("A3");
  const [mode, setMode] = useState<"exact" | "fit">("fit");
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
      setSize("design");
    }
  }

  useEffect(() => {
    // Start with a built-in sign ready to go: ?sign=table-banner picks that
    // one (from the equipment guide), otherwise the first.
    void (async () => {
      const wanted = new URLSearchParams(window.location.search).get("sign");
      const b = BUILT_IN.find((x) => x.id === wanted) ?? BUILT_IN[0];
      if (b.fixedSize) setSize("design");
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
      setPicked(new Set(pages.map((_, i) => i)));
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
            {(["design", "A0", "A1", "A2"] as SignSize[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={chip(size === s)}
              >
                {s === "design" ? "As designed" : s}
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
              {p} paper
            </button>
          ))}
        </div>
      </section>

      {opts && layout && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Sheets</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {opts.fit && (
              <Choice
                on={mode === "fit"}
                onClick={() => setMode("fit")}
                title={`${opts.fit.cols * opts.fit.rows} sheets, slightly smaller`}
                text={`${sizeLabel(opts.fit.signW, opts.fit.signH)} (${Math.round(opts.fit.scale * 100)}%), leaving room for the printer's edge`}
              />
            )}
            <Choice
              on={mode === "exact" || !opts.fit}
              onClick={() => setMode("exact")}
              title={`${opts.exact.cols * opts.exact.rows} sheets, exact size`}
              text={sizeLabel(opts.exact.signW, opts.exact.signH)}
            />
          </div>
          <Preview
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
        The PDF starts with a guide showing where each sheet goes. Print at
        Actual size (100%), overlap the sheets about 1 cm, line up the tick
        marks and tape them on the back.
      </p>
    </div>
  );
}

function Choice({
  on,
  onClick,
  title,
  text,
}: {
  on: boolean;
  onClick: () => void;
  title: string;
  text: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl bg-white p-3 text-left ring-2 ${on ? "ring-pink" : "ring-black/5 hover:ring-black/15"}`}
    >
      <span className="block text-sm font-semibold">{title}</span>
      <span className="block text-xs text-stone-500">{text}</span>
    </button>
  );
}

// The sign with the sheet grid over it.
function Preview({
  layout: l,
  image,
}: {
  layout: Layout;
  image: string | null;
}) {
  return (
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
            {tileName(Math.floor(i / l.cols), i % l.cols)}
          </span>
        ))}
      </div>
    </div>
  );
}
