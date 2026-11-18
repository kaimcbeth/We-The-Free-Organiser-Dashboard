// How to put a split sign together: numbered steps, each with a drawing.
// Shown on the sign splitter page; the same picture (rendered to
// public/resources/signs/how-to.png) is the last page of the downloaded PDF.

const NAVY = "#071130";
const PINK = "#ff47b9";
const CYAN = "#2fd9df";
const YELLOW = "#ffd90f";
const LINE = "#a8a29e"; // stone-400
const PAPER = "#ffffff";

type Pic = () => React.ReactElement;

export const SIGN_STEPS: { title: string; text: string; Pic: Pic }[] = [
  {
    title: "Print at Actual size",
    text: "Choose Actual size (100%), not Fit to page, or the sheets won't line up.",
    Pic: PrintPic,
  },
  {
    title: "Lay them out",
    text: "Each sheet's name (A1, A2…) is on its bottom edge. Lay them out like the guide on page 1.",
    Pic: LayoutPic,
  },
  {
    title: "Trim the white edges",
    text: "Cut the white strip off the left edge (not the first column) and the top edge (not the first row).",
    Pic: TrimPic,
  },
  {
    title: "Overlap to the ticks",
    text: "Lay each cut edge over the sheet beside or above it, right on its small tick marks. The picture should match up.",
    Pic: OverlapPic,
  },
  {
    title: "Tape the back",
    text: "Turn it over and tape along every join. Do a row at a time, then join the rows.",
    Pic: TapePic,
  },
  {
    title: "Back it",
    text: "Glue it onto thick cardboard for a sign, or clip or tape it to the front of the table for a banner.",
    Pic: BackPic,
  },
];

export function SignSteps({ printable = false }: { printable?: boolean }) {
  return (
    <section className="space-y-3" data-sign-steps>
      <h2
        className={
          printable ? "text-2xl font-bold text-navy" : "text-sm font-semibold"
        }
      >
        How to put it together
      </h2>
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SIGN_STEPS.map(({ title, text, Pic }, i) => (
          <li
            key={title}
            className="overflow-hidden rounded-xl bg-white ring-1 ring-black/10"
          >
            <div className="bg-stone-100 px-3 pt-3">
              <Pic />
            </div>
            <div className="space-y-1 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-pink text-xs font-bold text-navy">
                  {i + 1}
                </span>
                {title}
              </p>
              <p className="text-xs leading-snug text-stone-600">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---- drawings (160 × 100) ----

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 160 100"
      className="block h-auto w-full"
      aria-hidden="true"
      fontFamily="Arial, Helvetica, sans-serif"
    >
      {children}
    </svg>
  );
}

// A sheet: white paper with the picture inset by its margin.
function Sheet({
  x,
  y,
  w,
  h,
  m = 3,
  label,
  fill = NAVY,
  trimLeft = false,
  trimTop = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  m?: number;
  label?: string;
  fill?: string;
  trimLeft?: boolean;
  trimTop?: boolean;
}) {
  const l = trimLeft ? 0 : m;
  const t = trimTop ? 0 : m;
  return (
    <g>
      <rect
        x={x + (trimLeft ? m : 0)}
        y={y + (trimTop ? m : 0)}
        width={w - (trimLeft ? m : 0)}
        height={h - (trimTop ? m : 0)}
        fill={PAPER}
        stroke={LINE}
        strokeWidth={0.6}
      />
      <rect
        x={x + (trimLeft ? m : l)}
        y={y + (trimTop ? m : t)}
        width={w - m - (trimLeft ? m : l)}
        height={h - m - (trimTop ? m : t)}
        fill={fill}
      />
      {label && (
        <text
          x={x + w / 2}
          y={y + h - 0.9}
          fontSize={2.6}
          textAnchor="middle"
          fill={LINE}
        >
          {label}
        </text>
      )}
    </g>
  );
}

function PrintPic() {
  const row = (y: number, label: string, on: boolean) => (
    <g>
      <circle
        cx={46}
        cy={y}
        r={5}
        fill={PAPER}
        stroke={on ? PINK : LINE}
        strokeWidth={1.4}
      />
      {on && <circle cx={46} cy={y} r={2.6} fill={PINK} />}
      <text
        x={56}
        y={y + 3.2}
        fontSize={9}
        fontWeight={on ? 700 : 400}
        fill={on ? NAVY : LINE}
        textDecoration={on ? undefined : "line-through"}
      >
        {label}
      </text>
    </g>
  );
  return (
    <Frame>
      <rect x={30} y={8} width={100} height={88} rx={5} fill={PAPER} />
      <rect x={30} y={8} width={100} height={14} rx={5} fill={NAVY} />
      <rect x={30} y={16} width={100} height={6} fill={NAVY} />
      <text x={38} y={18} fontSize={7} fontWeight={700} fill={PAPER}>
        Print
      </text>
      {row(36, "Actual size", true)}
      {row(54, "Fit to page", false)}
      <text x={40} y={78} fontSize={7.5} fill={LINE}>
        Scale
      </text>
      <rect
        x={66}
        y={70}
        width={36}
        height={12}
        rx={3}
        fill={PAPER}
        stroke={PINK}
        strokeWidth={1.2}
      />
      <text
        x={84}
        y={79}
        fontSize={8}
        fontWeight={700}
        textAnchor="middle"
        fill={NAVY}
      >
        100%
      </text>
    </Frame>
  );
}

function LayoutPic() {
  const w = 34;
  const h = 26;
  const x0 = 80 - (w * 3 + 4) / 2;
  const y0 = 50 - (h * 2 + 2) / 2;
  const cells = [];
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 3; c++)
      cells.push(
        <g key={`${r}${c}`}>
          <Sheet
            x={x0 + c * (w + 2)}
            y={y0 + r * (h + 2)}
            w={w}
            h={h}
            m={2.4}
            fill={[PINK, YELLOW, CYAN][(r + c) % 3]}
          />
          <text
            x={x0 + c * (w + 2) + w / 2}
            y={y0 + r * (h + 2) + h / 2 + 3.5}
            fontSize={10}
            fontWeight={700}
            textAnchor="middle"
            fill={NAVY}
          >
            {"AB"[r]}
            {c + 1}
          </text>
        </g>,
      );
  return <Frame>{cells}</Frame>;
}

function Scissors({ x, y, rot = 0 }: { x: number; y: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <circle
        cx={-6}
        cy={-3}
        r={2.6}
        fill="none"
        stroke={NAVY}
        strokeWidth={1.3}
      />
      <circle
        cx={-6}
        cy={3}
        r={2.6}
        fill="none"
        stroke={NAVY}
        strokeWidth={1.3}
      />
      <line
        x1={-3.8}
        y1={-1.8}
        x2={6}
        y2={2.4}
        stroke={NAVY}
        strokeWidth={1.3}
      />
      <line
        x1={-3.8}
        y1={1.8}
        x2={6}
        y2={-2.4}
        stroke={NAVY}
        strokeWidth={1.3}
      />
    </g>
  );
}

function TrimPic() {
  const x = 46;
  const y = 12;
  const w = 74;
  const h = 70;
  const m = 7;
  return (
    <Frame>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={PAPER}
        stroke={LINE}
        strokeWidth={0.6}
      />
      <rect
        x={x + m}
        y={y + m}
        width={w - 2 * m}
        height={h - 2 * m}
        fill={NAVY}
      />
      {/* the strips to cut off */}
      <rect x={x} y={y} width={m} height={h} fill={PINK} opacity={0.25} />
      <rect
        x={x + m}
        y={y}
        width={w - m}
        height={m}
        fill={PINK}
        opacity={0.25}
      />
      <line
        x1={x + m}
        y1={y - 6}
        x2={x + m}
        y2={y + h + 1}
        stroke={PINK}
        strokeWidth={1.2}
        strokeDasharray="3 2"
      />
      <line
        x1={x - 6}
        y1={y + m}
        x2={x + w + 4}
        y2={y + m}
        stroke={PINK}
        strokeWidth={1.2}
        strokeDasharray="3 2"
      />
      <Scissors x={x + m} y={y + h + 7} rot={-90} />
      <Scissors x={x + w + 10} y={y + m} rot={180} />
    </Frame>
  );
}

function OverlapPic() {
  // A1 on the left with its tick marks; A2 (left edge trimmed) laid over it.
  const y = 18;
  const h = 64;
  const w = 64;
  const m = 5;
  const ov = 10;
  const ax = 24;
  const tickX = ax + w - m - ov; // where A2's picture starts
  const bx = tickX - m; // A2's sheet x (its trimmed edge sits on the tick)
  return (
    <Frame>
      <Sheet x={ax} y={y} w={w} h={h} m={m} fill={PINK} />
      {/* A1's tick marks, in its top and bottom margins */}
      <line
        x1={tickX}
        y1={y + 0.5}
        x2={tickX}
        y2={y + m - 1}
        stroke={NAVY}
        strokeWidth={0.9}
      />
      <line
        x1={tickX}
        y1={y + h - m + 1}
        x2={tickX}
        y2={y + h - 0.5}
        stroke={NAVY}
        strokeWidth={0.9}
      />
      <Sheet x={bx} y={y} w={w} h={h} m={m} fill={PINK} trimLeft />
      {/* where the cut edge meets the ticks */}
      <circle
        cx={tickX}
        cy={y + 2.5}
        r={4.5}
        fill="none"
        stroke={CYAN}
        strokeWidth={1.4}
      />
      <circle
        cx={tickX}
        cy={y + h - 2.5}
        r={4.5}
        fill="none"
        stroke={CYAN}
        strokeWidth={1.4}
      />
      <text
        x={ax + 22}
        y={y + h / 2 + 3}
        fontSize={9}
        fontWeight={700}
        fill={NAVY}
        textAnchor="middle"
      >
        A1
      </text>
      <text
        x={bx + 38}
        y={y + h / 2 + 3}
        fontSize={9}
        fontWeight={700}
        fill={NAVY}
        textAnchor="middle"
      >
        A2
      </text>
      <path
        d={`M ${bx + 52} ${y + h + 10} h -14`}
        stroke={NAVY}
        strokeWidth={1.4}
        markerEnd="url(#arrow)"
      />
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 6 6"
          refX="5"
          refY="3"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M0 0 L6 3 L0 6 z" fill={NAVY} />
        </marker>
      </defs>
    </Frame>
  );
}

function TapePic() {
  const back = "#e7e5e4"; // stone-200
  return (
    <Frame>
      {[0, 1].map((r) =>
        [0, 1, 2].map((c) => (
          <rect
            key={`${r}${c}`}
            x={26 + c * 36}
            y={18 + r * 32}
            width={38}
            height={34}
            fill={back}
            stroke={LINE}
            strokeWidth={0.6}
          />
        )),
      )}
      {/* tape over the joins */}
      {[0, 1].map((r) =>
        [1, 2].map((c) => (
          <rect
            key={`v${r}${c}`}
            x={26 + c * 36 - 3}
            y={18 + r * 32 + 4}
            width={8}
            height={26}
            fill={YELLOW}
            opacity={0.9}
          />
        )),
      )}
      {[0, 1, 2].map((c) => (
        <rect
          key={`h${c}`}
          x={26 + c * 36 + 4}
          y={18 + 32 - 2}
          width={30}
          height={8}
          fill={YELLOW}
          opacity={0.9}
        />
      ))}
      <text x={80} y={96} fontSize={7} textAnchor="middle" fill={LINE}>
        the back
      </text>
    </Frame>
  );
}

function BackPic() {
  return (
    <Frame>
      {/* cardboard */}
      <rect x={20} y={20} width={120} height={70} rx={2} fill="#c9a26b" />
      <rect x={24} y={14} width={116} height={70} rx={1} fill={NAVY} />
      <text
        x={82}
        y={46}
        fontSize={12}
        fontWeight={800}
        textAnchor="middle"
        fill={PINK}
      >
        YOUR
      </text>
      <text
        x={82}
        y={62}
        fontSize={12}
        fontWeight={800}
        textAnchor="middle"
        fill={YELLOW}
      >
        SIGN
      </text>
      {/* faint joins */}
      {[63, 102].map((x) => (
        <line
          key={x}
          x1={x}
          y1={14}
          x2={x}
          y2={84}
          stroke={PAPER}
          strokeOpacity={0.12}
        />
      ))}
      <line
        x1={24}
        y1={49}
        x2={140}
        y2={49}
        stroke={PAPER}
        strokeOpacity={0.12}
      />
    </Frame>
  );
}
