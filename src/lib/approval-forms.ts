import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

// Police / council notice forms, drawn as PDFs in the browser. Each area's
// form is one entry in FORMS; the fields are the same for all of them so the
// fill-in page doesn't change. Add a new area by adding a renderer here.

export type FormFields = {
  name: string; // legal name
  address: string; // street address
  postcode: string;
  phone: string;
  organisation: string; // "We The Free Sydney"
  day: string; // "21st"
  monthYear: string; // "September 2025"
  number: string; // expected people
  place: string;
  start: string; // "1pm"
  end: string; // "5pm"
  purpose: string;
  special: string;
  capacity: string; // "Organiser, We The Free Sydney"
  date: string; // date signed, "24/10/26"
  signature: Uint8Array | null; // PNG
};

// "21st", "2nd", "13th"
export function ordinal(n: number) {
  const v = n % 100;
  const suffix =
    v >= 11 && v <= 13
      ? "th"
      : (({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ??
        "th");
  return `${n}${suffix}`;
}

// "3pm", "3:30pm" in the event's time zone.
export function shortTime(iso: string, tz: string) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  }).formatToParts(new Date(iso));
  const h = parts.find((p) => p.type === "hour")?.value ?? "";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  const ap = (parts.find((p) => p.type === "dayPeriod")?.value ?? "")
    .toLowerCase()
    .replace(/\./g, "");
  return `${h}${m === "00" ? "" : `:${m}`}${ap}`;
}

type Seg = { text: string; bold?: boolean; italic?: boolean };

const NAVY = rgb(0, 0, 0);
const GREY = rgb(0.4, 0.4, 0.4);

async function nswForm1(f: FormFields): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Notice of intention to hold a public assembly");
  const page = pdf.addPage([595.28, 841.89]); // A4
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const font = (s: Seg): PDFFont =>
    s.bold ? bold : s.italic ? italic : regular;
  const left = 72;
  const right = 595.28 - 72;
  let y = 841.89 - 72;

  // Mixed regular/bold text, wrapped to the page width.
  function para(
    segs: Seg[],
    {
      size = 11,
      x = left,
      gap = 6,
      label,
    }: { size?: number; x?: number; gap?: number; label?: string } = {},
  ) {
    const words: { w: string; f: PDFFont }[] = [];
    for (const s of segs)
      for (const w of s.text.split(/(\s+)/).filter((t) => t.length))
        words.push({ w, f: font(s) });
    let lineX = x;
    y -= size;
    for (const { w, f: wf } of words) {
      const width = wf.widthOfTextAtSize(w, size);
      if (/^\s+$/.test(w)) {
        if (lineX > x) lineX += width;
        continue;
      }
      if (lineX + width > right && lineX > x) {
        y -= size * 1.35;
        lineX = x;
      }
      page.drawText(w, { x: lineX, y, size, font: wf, color: NAVY });
      lineX += width;
    }
    if (label) {
      y -= 9;
      page.drawText(label, { x, y, size: 6.5, font: regular, color: GREY });
    }
    y -= gap;
  }

  para(
    [{ text: "NOTICE OF INTENTION TO HOLD A PUBLIC ASSEMBLY", bold: true }],
    { size: 14, gap: 10 },
  );
  para([{ text: "Summary Offences Act 1988", bold: true }], {
    size: 12,
    gap: 10,
  });
  para([{ text: "To the Commissioner of Police" }], { gap: 14 });

  page.drawText("1", { x: left, y: y - 11, size: 11, font: regular });
  const ind = left + 38;
  para([{ text: "I, " }, { text: f.name, bold: true }], {
    x: ind,
    label: "Name",
  });
  para([{ text: "Of " }, { text: f.address, bold: true }], {
    x: ind,
    label: "Address",
  });
  para([{ text: "on behalf of " }, { text: f.organisation, bold: true }], {
    x: ind,
    label: "Organisation",
  });
  para(
    [
      { text: "notify the Commissioner of Police that on the " },
      { text: f.day, bold: true },
    ],
    { x: ind, label: "Day" },
  );
  para([{ text: "of " }, { text: f.monthYear, bold: true }], {
    x: ind,
    label: "Month/Year",
  });
  para([{ text: "it is intended to hold:" }], { x: ind, gap: 12 });

  para([{ text: "either", bold: true }, { text: ":" }], { gap: 8 });
  const ind2 = left + 20;
  page.drawText("(a)", { x: left, y: y - 11, size: 11, font: regular });
  para(
    [
      { text: "a public assembly, not being a procession, of approximately " },
      { text: f.number, bold: true },
    ],
    { x: ind2, label: "Number" },
  );
  para(
    [
      { text: "persons which will assemble at " },
      { text: f.place, bold: true },
    ],
    { x: ind2, label: "Place" },
  );
  para([{ text: "at approximately " }, { text: f.start, bold: true }], {
    x: ind2,
    label: "Time",
  });
  para(
    [{ text: "and disperse at approximately " }, { text: f.end, bold: true }],
    { x: ind2, label: "Time", gap: 14 },
  );

  page.drawText("2", { x: left, y: y - 11, size: 11, font: regular });
  para(
    [
      { text: "The purpose of the proposed assembly is " },
      { text: f.purpose, bold: true },
    ],
    { x: ind, label: "State purpose", gap: 12 },
  );
  para(
    [
      {
        text: "*(iv) Other special characteristics of the proposed assembly are as follows: ",
      },
      { text: f.special, bold: true },
    ],
    { x: ind, gap: 18 },
  );

  para(
    [
      {
        text: "4  I take responsibility for organising and conducting the proposed public assembly.",
      },
    ],
    { gap: 10 },
  );
  para(
    [
      { text: "5  Notices for the purposes of the " },
      { text: "Summary Offences Act 1988", italic: true },
      { text: " may be served on me at the following:" },
    ],
    { gap: 10 },
  );
  para([{ text: "Address: " }, { text: f.address, bold: true }], { gap: 8 });
  para([{ text: "Post Code " }, { text: f.postcode, bold: true }], { gap: 8 });
  para([{ text: "Telephone: " }, { text: f.phone, bold: true }], { gap: 14 });

  // Signature
  page.drawText("Signed:", { x: left, y: y - 11, size: 11, font: regular });
  if (f.signature) {
    const img = await pdf.embedPng(f.signature);
    const h = 36;
    const w = Math.min((img.width / img.height) * h, 200);
    page.drawImage(img, {
      x: left + 48,
      y: y - 28,
      width: w,
      height: (w / img.width) * img.height,
    });
  }
  y -= 40;
  para([{ text: "Capacity/Title: " }, { text: f.capacity, bold: true }], {
    gap: 8,
  });
  para([{ text: "Date: " }, { text: f.date, bold: true }]);

  return pdf.save();
}

export const FORMS: Record<
  string,
  { label: string; render: (f: FormFields) => Promise<Uint8Array> }
> = {
  nsw_form1: {
    label: "NSW Police Form 1 (Notice of intention to hold a public assembly)",
    render: nswForm1,
  },
};
