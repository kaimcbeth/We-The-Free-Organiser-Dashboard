// PDR as a PDF, laid out like Kai's Word PDR (Kai, 26 Nov 2026: "Yes, a
// PDF"). Built in the browser with pdf-lib; standard Helvetica, so text is
// cleaned to characters it can draw (emoji are dropped).
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import {
  ASSESSMENT,
  INTRO,
  JOB,
  KIND_LABEL,
  OBJECTIVE_STATUS,
  TEAM,
  formatMeeting,
  ratingText,
  type Pdr,
  type RatedRow,
} from "@/lib/pdr";

const NAVY = rgb(0.043, 0.071, 0.2);
const GREY = rgb(0.4, 0.4, 0.42);
const LINE = rgb(0.85, 0.85, 0.87);
const NOTE = rgb(0.996, 0.96, 0.8);
const W = 595.28;
const H = 841.89;
const M = 48;

const OK = /[ -~ -ÿ‘’“”–—…•€]/;
function clean(s: string | null | undefined): string {
  return Array.from((s ?? "").replace(/\r/g, "").replace(/\t/g, "  "))
    .map((c) => (c === "\n" || OK.test(c) ? c : ""))
    .join("")
    .replace(/ {2,}/g, " ");
}

export async function pdrPdf(pdr: Pdr): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`PDR ${pdr.year} - ${pdr.reviewee_name}`);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let logo: Awaited<ReturnType<PDFDocument["embedPng"]>> | null = null;
  try {
    const bytes = await (await fetch("/brand/wtf-logo-navy.png")).arrayBuffer();
    logo = await doc.embedPng(bytes);
  } catch {
    logo = null;
  }

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;

  const newPage = () => {
    page = doc.addPage([W, H]);
    y = H - M;
  };
  const need = (h: number) => {
    if (y - h < M) newPage();
  };
  const wrap = (text: string, f: PDFFont, size: number, width: number) => {
    const out: string[] = [];
    for (const para of clean(text).split("\n")) {
      let line = "";
      for (const word of para.split(" ")) {
        const t = line ? `${line} ${word}` : word;
        if (f.widthOfTextAtSize(t, size) <= width) line = t;
        else {
          if (line) out.push(line);
          line = word;
          while (f.widthOfTextAtSize(line, size) > width && line.length > 1) {
            let i = line.length - 1;
            while (i > 1 && f.widthOfTextAtSize(line.slice(0, i), size) > width)
              i--;
            out.push(line.slice(0, i));
            line = line.slice(i);
          }
        }
      }
      out.push(line);
    }
    return out;
  };
  const text = (
    s: string,
    o: {
      size?: number;
      f?: PDFFont;
      color?: ReturnType<typeof rgb>;
      x?: number;
      width?: number;
      gap?: number;
    } = {},
  ) => {
    const size = o.size ?? 10;
    const f = o.f ?? font;
    const x = o.x ?? M;
    const lines = wrap(s, f, size, o.width ?? W - M - x);
    for (const l of lines) {
      need(size * 1.35);
      page.drawText(l, {
        x,
        y: y - size,
        size,
        font: f,
        color: o.color ?? NAVY,
      });
      y -= size * 1.35;
    }
    y -= o.gap ?? 4;
  };
  const heading = (s: string) => {
    need(40);
    y -= 8;
    page.drawText(clean(s), {
      x: M,
      y: y - 14,
      size: 14,
      font: bold,
      color: NAVY,
    });
    y -= 20;
    page.drawLine({
      start: { x: M, y },
      end: { x: W - M, y },
      thickness: 1,
      color: NAVY,
    });
    y -= 10;
  };
  const sub = (s: string) => {
    need(30);
    y -= 4;
    text(s, { size: 11.5, f: bold, gap: 3 });
  };
  const note = (s: string | undefined, who: string) => {
    if (!s?.trim()) return;
    const lines = wrap(`${who}: ${s}`, font, 9, W - 2 * M - 16);
    const h = lines.length * 9 * 1.35 + 8;
    need(h + 4);
    page.drawRectangle({
      x: M,
      y: y - h,
      width: W - 2 * M,
      height: h,
      color: NOTE,
    });
    let yy = y - 4;
    for (const l of lines) {
      page.drawText(l, { x: M + 8, y: yy - 9, size: 9, font, color: NAVY });
      yy -= 9 * 1.35;
    }
    y -= h + 6;
  };
  const rule = () => {
    page.drawLine({
      start: { x: M, y: y + 2 },
      end: { x: W - M, y: y + 2 },
      thickness: 0.5,
      color: LINE,
    });
    y -= 4;
  };

  const a = pdr.answers ?? {};
  const n = pdr.notes ?? {};
  const who = `${(pdr.reviewer_name ?? "Reviewer").split(" ")[0]}'s notes`;

  // Header
  if (logo) {
    const w = 70;
    const h = (logo.height / logo.width) * w;
    page.drawImage(logo, { x: W - M - w, y: y - h, width: w, height: h });
  }
  page.drawText("Performance & Development Review", {
    x: M,
    y: y - 20,
    size: 20,
    font: bold,
    color: NAVY,
  });
  y -= 30;
  text(
    `${KIND_LABEL[pdr.kind]} ${pdr.year}${pdr.locked_at ? "" : " (draft, not signed off)"}`,
    { size: 11, color: GREY, gap: 10 },
  );

  const info: [string, string][] = [
    ["Reviewee", pdr.reviewee_name],
    ["Role", `Regional Support Lead${pdr.region ? `, ${pdr.region}` : ""}`],
    ["Reviewer", pdr.reviewer_name ?? "Community manager"],
    ["Meeting", formatMeeting(pdr.meeting_at, pdr.timezone)],
  ];
  for (const [k, v] of info) {
    need(16);
    page.drawText(k, { x: M, y: y - 10, size: 10, font: bold, color: NAVY });
    page.drawText(clean(v), {
      x: M + 80,
      y: y - 10,
      size: 10,
      font,
      color: NAVY,
    });
    y -= 16;
  }
  y -= 6;
  text(INTRO, { size: 9, color: GREY, gap: 8 });

  if (pdr.goals.length) {
    sub(`Organisational goals for ${pdr.year}`);
    for (const g of pdr.goals) {
      const target =
        g.target != null ? `${g.target.toLocaleString("en-AU")} ` : "";
      const prog =
        g.progress != null
          ? `  (${g.progress.toLocaleString("en-AU")} so far)`
          : "";
      text(`•  ${target}${g.label}${prog}`, { size: 10, gap: 1 });
    }
    y -= 4;
  }

  // 1
  heading("1. Looking back");
  sub("Objectives");
  const objectives = a.objectives ?? [];
  if (!objectives.length) text("None listed.", { color: GREY });
  objectives.forEach((o, i) => {
    const status =
      OBJECTIVE_STATUS.find((s) => s.value === o.status)?.label ?? "Not rated";
    text(`${i + 1}. ${o.text || "(untitled)"}`, { f: bold, gap: 1 });
    text(`${status}${o.comment ? ` - ${o.comment}` : ""}`, {
      x: M + 14,
      gap: 3,
    });
    note(n.text?.[`objective.${i}`], who);
  });
  sub("General assessment");
  for (const q of ASSESSMENT) {
    text(q.label, { f: bold, size: 9.5, gap: 1 });
    text(a.assessment?.[q.key] || "-", { gap: 5 });
  }
  note(n.text?.assessment, who);

  // 2
  heading("2. Well-being");
  const ratedTable = (
    title: string,
    rows: { key: string; label: string }[],
    group: string,
    vals: Record<string, RatedRow> | undefined,
    extra: string | undefined,
  ) => {
    sub(title);
    need(16);
    page.drawText("Rating 1-5", {
      x: W - M - 120,
      y: y - 8,
      size: 8,
      font: bold,
      color: GREY,
    });
    page.drawText(pdr.notes ? "Reviewer" : "", {
      x: W - M - 50,
      y: y - 8,
      size: 8,
      font: bold,
      color: GREY,
    });
    y -= 14;
    for (const r of rows) {
      const v = vals?.[r.key];
      const lines = wrap(r.label, font, 9.5, W - 2 * M - 140);
      need(lines.length * 13 + 4);
      const top = y;
      for (const l of lines) {
        page.drawText(l, { x: M, y: y - 9.5, size: 9.5, font, color: NAVY });
        y -= 13;
      }
      page.drawText(ratingText(v?.rating ?? null), {
        x: W - M - 105,
        y: top - 9.5,
        size: 10,
        font: bold,
        color: NAVY,
      });
      const theirs = n.rating?.[`${group}.${r.key}`];
      if (pdr.notes && theirs != null)
        page.drawText(ratingText(theirs), {
          x: W - M - 40,
          y: top - 9.5,
          size: 10,
          font: bold,
          color: NAVY,
        });
      if (v?.comment)
        text(v.comment, {
          x: M + 12,
          size: 9,
          color: GREY,
          width: W - 2 * M - 152,
          gap: 1,
        });
      note(n.text?.[`${group}.${r.key}`], who);
      rule();
    }
    if (extra) {
      text("Anything else", { f: bold, size: 9.5, gap: 1 });
      text(extra, { gap: 4 });
    }
    note(n.text?.[`${group}Extra`], who);
  };
  ratedTable("Your role", JOB, "job", a.job, a.jobExtra);
  ratedTable("Your team", TEAM, "team", a.team, a.teamExtra);

  // 3
  heading("3. Looking forward");
  sub("Professional development");
  const dev = a.development ?? [];
  if (!dev.length) text("None listed.", { color: GREY });
  for (const d of dev) {
    text(d.skill || "(skill)", { f: bold, gap: 1 });
    if (d.how) text(`How: ${d.how}`, { x: M + 12, gap: 1 });
    if (d.measure) text(`Success: ${d.measure}`, { x: M + 12, gap: 1 });
    if (d.date) text(`By: ${d.date}`, { x: M + 12, gap: 1 });
    y -= 4;
  }
  note(n.text?.development, who);
  sub("Goals for the coming months");
  const goals = a.goals ?? [];
  if (!goals.length) text("None listed.", { color: GREY });
  goals.forEach((g, i) => {
    text(`${i + 1}. ${g.text || "(goal)"}`, { f: bold, gap: 1 });
    if (g.steps) text(g.steps, { x: M + 14, gap: 3 });
  });
  note(n.text?.goals, who);
  if (n.text?.general) {
    sub("Reviewer's overall notes");
    text(n.text.general);
  }

  // Sign-off
  heading("Sign-off");
  text(
    "This confirms the PDR is mutually agreed and this record accurately reflects the review and ongoing areas of development.",
    { size: 9, color: GREY, gap: 8 },
  );
  need(60);
  const when = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "Not signed";
  const cols: [string, string, string | null][] = [
    [
      "Reviewee",
      pdr.reviewee_signed_name ?? pdr.reviewee_name,
      pdr.reviewee_signed_at,
    ],
    [
      "Reviewer",
      pdr.reviewer_signed_name ?? pdr.reviewer_name ?? "",
      pdr.reviewer_signed_at,
    ],
  ];
  cols.forEach(([label, name, at], i) => {
    const x = M + i * ((W - 2 * M) / 2);
    page.drawText(label, { x, y: y - 9, size: 9, font: bold, color: GREY });
    page.drawText(clean(name), {
      x,
      y: y - 24,
      size: 11,
      font: bold,
      color: NAVY,
    });
    page.drawText(
      at ? `Agreed (ticked in the Movement Hub) ${when(at)}` : "Not signed",
      { x, y: y - 38, size: 9, font, color: NAVY },
    );
  });
  y -= 50;

  // Page numbers
  const pages = doc.getPages();
  pages.forEach((p, i) =>
    p.drawText(
      `${clean(pdr.reviewee_name)} · PDR ${pdr.year} · ${i + 1} of ${pages.length}`,
      {
        x: M,
        y: 24,
        size: 8,
        font,
        color: GREY,
      },
    ),
  );
  return doc.save();
}
