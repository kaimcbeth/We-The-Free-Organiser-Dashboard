"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/sheet";
import { SaveToPlanner } from "@/components/save-to-planner";
import type { GraphicEvent } from "@/components/graphic-maker";
import { grain, loadPosterFonts } from "@/components/graphic-poster";
import { fmt, place, shortTitle } from "@/components/graphic-photo-styles";
import {
  DISPLAY,
  NAVY,
  PINK,
  YELLOW,
  bodyFont,
  loadImage,
} from "@/components/recap-maker";

// Sign-up list graphic (Kai, 12 Nov 2026, from his WhatsApp "we need at
// least 20 people … 1. Me (Kai M) 2. ____" message): numbered spots, the
// names filled in so far, the rest blank. The list is saved on the event
// (events.signup_names / signup_target) so it can be updated as people reply.

const SIZES = {
  post: { label: "Post", w: 1080, h: 1350 },
  story: { label: "Story", w: 1080, h: 1920 },
} as const;
type Size = keyof typeof SIZES;

type Texts = {
  kicker: string;
  heading: string;
  details: string;
  rolesTitle: string;
  rolesNote: string;
  intro: string;
  footer: string;
};

// Roles (Kai, 12 Nov 2026: "I want everyone to have roles from now on …
// can have multiple per person"). Role.names = the people on the list who
// have that role; spots is a leftover from the first version and unused.
export type Role = {
  emoji: string;
  label: string;
  spots: number;
  names: string[];
};
const role = (emoji: string, label: string): Role => ({
  emoji,
  label,
  spots: 0,
  names: [],
});
export const DEFAULT_ROLES: Role[] = [
  role("📸", "Photos"),
  role("👋", "Newcomer welcomes"),
  role("🛠️", "Equipment setup"),
];
// Earlier default sets: an event saved with one of them starts on the new set.
const OLD_LABELS = [
  "Photos|Attendance and welcoming new members|Equipment setup",
  "Signs|Outreach|Photos|Newcomer welcomes|Equipment setup|Prize table",
];

function defaults(e: GraphicEvent, tz: string): Texts {
  const movie = /movie challenge|3mmc/i.test(e.title);
  const day = fmt(e.startsAt, tz, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = fmt(e.startsAt, tz, { hour: "numeric", minute: "2-digit" })
    .replace(/\s/g, "")
    .replace(":00", "")
    .toLowerCase();
  return {
    kicker: "",
    heading: movie
      ? "3 Minute Movie Challenge"
      : shortTitle(e.title, e.community),
    details: [day, time, place(e)].filter(Boolean).join(" · "),
    rolesTitle: "We are especially in need of help with:",
    rolesNote: "",
    intro: "",
    footer: "Reply to grab a spot",
  };
}

// Words onto lines that fit the width (at most `max` lines).
function lines(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  max: number,
) {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out.length > max ? null : out;
}

export function drawSignups(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: Texts,
  names: string[],
  target: number,
  mark: HTMLImageElement | null,
  roles: Role[] = [],
) {
  const body = bodyFont();
  const m = 72;
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, w, h);
  grain(ctx, w, h);
  // Soft pink glow top right.
  const glow = ctx.createRadialGradient(w, 0, 0, w, 0, w * 0.8);
  glow.addColorStop(0, "rgba(255,71,185,0.22)");
  glow.addColorStop(1, "rgba(255,71,185,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  if (mark) {
    const mh = 76;
    const mw = (mark.naturalWidth / mark.naturalHeight) * mh;
    ctx.drawImage(mark, w - m - mw, m - 8, mw, mh);
  }

  let y = m + 30;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  if (t.kicker) {
    ctx.fillStyle = PINK;
    ctx.font = `800 34px ${body}`;
    ctx.letterSpacing = "4px";
    ctx.fillText(t.kicker.toUpperCase(), m, y);
    ctx.letterSpacing = "0px";
    y += 30;
  }

  // Heading: biggest that fits on two lines, clear of the logo.
  const hw = w - m * 2 - 90;
  let size = h > 1500 ? 96 : 84;
  let heading: string[] | null = null;
  while (size >= 40) {
    ctx.font = `${size}px ${DISPLAY}`;
    heading = lines(ctx, t.heading, hw, 2);
    if (heading) break;
    size -= 4;
  }
  ctx.fillStyle = "#ffffff";
  for (const l of heading ?? [t.heading]) {
    y += size * 1.02;
    ctx.fillText(l, m, y);
  }

  if (t.details) {
    y += 56;
    ctx.fillStyle = YELLOW;
    ctx.font = `700 36px ${body}`;
    ctx.fillText(t.details, m, y);
  }

  // How many so far.
  const filled = names.length;
  const spots = Math.max(target, filled);
  y += 58;
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 30px ${body}`;
  const count = `${filled} of ${target} spots filled`;
  ctx.fillText(count, m, y);
  const barX = m + ctx.measureText(count).width + 24;
  const barW = w - m - barX;
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.beginPath();
  ctx.roundRect(barX, y - 20, barW, 14, 7);
  ctx.fill();
  ctx.fillStyle = PINK;
  ctx.beginPath();
  ctx.roundRect(
    barX,
    y - 20,
    Math.max(14, barW * Math.min(1, filled / target)),
    14,
    7,
  );
  ctx.fill();

  // Roles (Kai, 12 Nov 2026: "just have the roles at the top"): a line,
  // then one role per row as a white-outlined pill followed by whoever has
  // taken it.
  const story = h > 1500;
  if (roles.length) {
    y += story ? 76 : 62;
    if (t.rolesTitle) {
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${story ? 32 : 30}px ${body}`;
      ctx.fillText(t.rolesTitle, m, y);
      y += story ? 18 : 10;
    }
    const pillH = story ? 52 : 46;
    const gap = story ? 14 : 10;
    let py = y;
    roles.forEach((r) => {
      py += gap;
      const label = r.label || "Role";
      ctx.font = `800 ${story ? 26 : 24}px ${body}`;
      const pw = ctx.measureText(label).width + 36;
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(m + 1, py + 1, pw - 2, pillH - 2, pillH / 2);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      ctx.fillText(label, m + 18, py + pillH / 2 + 1);
      if (r.names.length) {
        const who = r.names.join(", ");
        const room = w - m - (m + pw + 20);
        let fs = story ? 30 : 27;
        ctx.font = `700 ${fs}px ${body}`;
        while (fs > 16 && ctx.measureText(who).width > room) {
          fs -= 1;
          ctx.font = `700 ${fs}px ${body}`;
        }
        ctx.fillStyle = YELLOW;
        ctx.fillText(who, m + pw + 20, py + pillH / 2 + 1, room);
      }
      ctx.textBaseline = "alphabetic";
      py += pillH;
    });
    y = py;
    // A thin rule between the roles and the numbered list.
    y += story ? 40 : 28;
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(m, y, w - m * 2, 2);
    y -= 8;
  }
  // The spots.
  const footH = t.footer ? 110 : 50;
  const top = y + 44;
  const bottom = h - footH;
  const cols = spots <= 10 ? 1 : spots <= 30 ? 2 : 3;
  const rows = Math.ceil(spots / cols);
  const rowH = Math.min(story ? 112 : 76, (bottom - top) / rows);
  // Stories have room to spare: centre the spots in it.
  const top0 = top + (story ? (bottom - top - rowH * rows) / 2 : 0);
  const colW = (w - m * 2) / cols;
  const r = rowH * 0.34;
  const nameSize = Math.round(rowH * 0.46);
  for (let i = 0; i < spots; i++) {
    const c = Math.floor(i / rows);
    const row = i % rows;
    const cx = m + c * colW + r;
    const cy = top0 + row * rowH + rowH / 2;
    const name = names[i];
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    if (name) {
      ctx.fillStyle = PINK;
      ctx.fill();
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = name ? NAVY : "rgba(255,255,255,0.55)";
    ctx.font = `800 ${Math.round(r * 0.95)}px ${body}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(i + 1), cx, cy + 1);
    ctx.textAlign = "left";
    const nx = cx + r + 18;
    const maxW = colW - (nx - (m + c * colW)) - 24;
    if (name) {
      let s = nameSize;
      ctx.font = `700 ${s}px ${body}`;
      while (s > 16 && ctx.measureText(name).width > maxW) {
        s -= 2;
        ctx.font = `700 ${s}px ${body}`;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillText(name, nx, cy + 1);
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 9]);
      ctx.beginPath();
      ctx.moveTo(nx, cy + r * 0.55);
      ctx.lineTo(nx + Math.min(maxW, 300), cy + r * 0.55);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.textBaseline = "alphabetic";
  }

  // Footer.
  ctx.textAlign = "center";
  if (t.footer) {
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 34px ${body}`;
    ctx.fillText(t.footer, w / 2, h - 60);
  }
  ctx.textAlign = "left";
}

// Names from pasted WhatsApp messages (Kai, 12 Nov 2026: "paste in the
// subsequent messages"): every sender counts as in, unless all their messages
// sound like a no. First names only (Kai); a last initial is added only when
// two different people share a first name.
const LINE =
  /^\s*(?:\[[^\]]+\]|\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]\.?m\.?)?\s+-)\s*(?:~\s*)?([^:]{1,60}?):\s*(.*)$/i;
const NO =
  /\b(can'?t|cannot|can not|won'?t (?:be|make)|not able|unable|not coming|not going to make|out this time|sit this one out)\b/i;
export function namesFromChat(text: string): string[] {
  const said = new Map<string, string[]>();
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.replace(/[\u200e\u200f\u202a-\u202e]/g, "").match(LINE);
    if (!m) continue;
    const who = m[1]
      .replace(/\([^)]*\)/g, "")
      .replace(/[^\p{L}\p{M}' -]/gu, "")
      .trim();
    if (!who || /^\+?\d/.test(who)) continue;
    said.set(who, [...(said.get(who) ?? []), m[2]]);
  }
  const people = [...said]
    .filter(([, msgs]) => !msgs.every((t) => NO.test(t)))
    .map(([who]) => who.split(/\s+/));
  return people.map((parts) => {
    const first = parts[0];
    const clash = people.some(
      (o) => o !== parts && o[0].toLowerCase() === first.toLowerCase(),
    );
    return clash && parts[1] ? `${first} ${parts[1][0]}` : first;
  });
}

// The list as text for the group chat, like Kai's: the opening line, each
// role with who's on it ("📸 Photos - Asha, Rory" or "____"), then the
// numbered list ("1. Kai M / 2. ____").
export function listText(
  names: string[],
  target: number,
  roles: Role[] = [],
  t?: Pick<Texts, "intro" | "rolesNote" | "rolesTitle">,
) {
  const n = Math.max(target, names.length);
  const list = Array.from(
    { length: n },
    (_, i) => `${i + 1}. ${names[i] ?? "________"}`,
  ).join("\n");
  if (!roles.length) return list;
  const roleLines = roles.map(
    (r) =>
      `${r.emoji ? `${r.emoji} ` : ""}${r.label} - ${r.names.length ? r.names.join(", ") : "____"}`,
  );
  return [
    t?.intro,
    [t?.rolesTitle, ...roleLines].filter(Boolean).join("\n"),
    t?.rolesNote ? `🩵 ${t.rolesNote}` : "",
    list,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function SignupListMaker({
  event,
  tz,
  label = "Sign-up list",
  className = "text-xs font-medium text-pink-ink hover:underline",
}: {
  event: GraphicEvent & { teamId: string; eventId: string };
  tz: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      {open && <Maker event={event} tz={tz} onClose={() => setOpen(false)} />}
    </>
  );
}

type Rsvp = {
  person: { first_name: string; last_name: string | null } | null;
};

function Maker({
  event,
  tz,
  onClose,
}: {
  event: GraphicEvent & { teamId: string; eventId: string };
  tz: string;
  onClose: () => void;
}) {
  const [size, setSize] = useState<Size>("post");
  const [texts, setTexts] = useState<Texts>(() => defaults(event, tz));
  const [list, setList] = useState("");
  const [target, setTarget] = useState(20);
  const [loaded, setLoaded] = useState(false);
  const [going, setGoing] = useState<string[]>([]);
  const [mark, setMark] = useState<HTMLImageElement | null>(null);
  const [fonts, setFonts] = useState(0);
  const [msg, setMsg] = useState("");
  const [saved, setSaved] = useState("");
  const [pasted, setPasted] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const names = list
    .split("\n")
    .map((s) =>
      s
        .replace(/^\s*\d+[.)]\s*/, "")
        .replace(/_+/g, "")
        .trim(),
    )
    .filter(Boolean);
  const [drafts, setDrafts] = useState<Role[]>(DEFAULT_ROLES);
  // Only people still on the list keep their roles.
  const roles = drafts
    .filter((r) => r.label.trim())
    .map((r) => ({
      ...r,
      label: r.label.trim(),
      names: names.filter((n) =>
        r.names.some((x) => x.toLowerCase() === n.toLowerCase()),
      ),
    }));
  const rolesKey = JSON.stringify(roles);

  useEffect(() => {
    let live = true;
    loadPosterFonts()?.then(() => live && setFonts((n) => n + 1));
    loadImage("/brand/wtf-mark.png")
      .then((img) => live && setMark(img))
      .catch(() => {});
    const supabase = createClient();
    Promise.all([
      supabase
        .from("events")
        .select("signup_names, signup_target, signup_roles")
        .eq("id", event.eventId)
        .maybeSingle(),
      supabase
        .from("event_rsvps")
        .select("person:people(first_name, last_name)")
        .eq("event_id", event.eventId)
        .eq("status", "going")
        .order("updated_at")
        .returns<Rsvp[]>(),
    ]).then(([ev, rsvps]) => {
      if (!live) return;
      const people = (rsvps.data ?? [])
        .map((r) => r.person)
        .filter((p): p is NonNullable<Rsvp["person"]> => !!p);
      const short = people.map((p) => p.first_name.trim().split(/\s+/)[0]);
      setGoing(short);
      const savedNames = (ev.data?.signup_names as string[] | null) ?? null;
      setList((savedNames ?? short).join("\n"));
      if (ev.data?.signup_target) setTarget(ev.data.signup_target as number);
      const savedRoles = ev.data?.signup_roles as Role[] | null;
      if (
        Array.isArray(savedRoles) &&
        !OLD_LABELS.includes(savedRoles.map((r) => r.label).join("|"))
      )
        setDrafts(
          savedRoles.map((r) => ({ ...r, names: r.names ?? [], spots: 0 })),
        );
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, [event.eventId]);

  // Save the list on the event a moment after each change.
  useEffect(() => {
    if (!loaded) return;
    const id = window.setTimeout(async () => {
      const { data } = await createClient().rpc("set_event_signups", {
        p_event_id: event.eventId,
        p_names: names,
        p_target: target,
        p_roles: JSON.parse(rolesKey),
      });
      setSaved(data ? "Saved" : "Couldn't save the list.");
    }, 900);
    return () => window.clearTimeout(id);
    // names comes from list; saving on list/target changes is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, target, rolesKey, loaded, event.eventId]);

  const { w, h } = SIZES[size];
  const namesKey = names.join("\n");
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    drawSignups(
      ctx,
      w,
      h,
      texts,
      namesKey ? namesKey.split("\n") : [],
      target,
      mark,
      JSON.parse(rolesKey),
    );
  }, [w, h, texts, namesKey, target, mark, fonts, rolesKey]);

  const missing = going.filter(
    (g) => !names.some((n) => n.toLowerCase() === g.toLowerCase()),
  );

  const blob = () =>
    new Promise<Blob | null>((r) => canvas.current?.toBlob(r, "image/png"));
  const fileName = `sign-up-list-${size}.png`;
  async function share() {
    setMsg("");
    const b = await blob();
    if (!b) return;
    const file = new File([b], fileName, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] }).catch(() => {});
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = fileName;
    a.click();
  }
  async function copyImage() {
    try {
      const png = blob().then((b) => {
        if (!b) throw new Error("no image");
        return b;
      });
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": png }),
      ]);
      setMsg("Copied the image.");
    } catch {
      setMsg("Couldn't copy. Use Share or download instead.");
    }
  }
  async function copyText() {
    try {
      await navigator.clipboard.writeText(
        listText(names, target, roles, texts),
      );
      setMsg("Copied the list as text.");
    } catch {
      setMsg("Couldn't copy the text.");
    }
  }

  const input =
    "mt-1 block w-full rounded-lg bg-white px-2.5 py-1.5 text-sm text-navy ring-1 ring-stone-300";
  const btn =
    "rounded-xl bg-navy/5 px-3 py-1.5 text-sm font-semibold text-navy hover:bg-navy/10";
  const field = (key: keyof Texts, label: string) => (
    <label className="block text-xs font-medium text-stone-600">
      {label}
      <input
        value={texts[key]}
        onChange={(e) => setTexts({ ...texts, [key]: e.target.value })}
        className={input}
      />
    </label>
  );

  return (
    <Sheet title="Sign-up list" onClose={onClose}>
      <div className="flex gap-1.5">
        {(Object.keys(SIZES) as Size[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSize(s)}
            className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${size === s ? "bg-navy text-white ring-navy" : "bg-white text-stone-600 ring-stone-300"}`}
          >
            {SIZES[s].label}
          </button>
        ))}
      </div>
      <canvas
        ref={canvas}
        width={w}
        height={h}
        className="mx-auto mt-3 block w-full max-w-xs rounded-xl shadow-sm ring-1 ring-black/10"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={share}
          className="rounded-xl bg-pink px-3 py-1.5 text-sm font-semibold text-navy hover:bg-pink-strong"
        >
          Share or download
        </button>
        <button type="button" onClick={copyImage} className={btn}>
          Copy image
        </button>
        <button type="button" onClick={copyText} className={btn}>
          Copy as text
        </button>
        <SaveToPlanner
          teamId={event.teamId}
          tz={tz}
          note={`Sign-up list: ${texts.heading}`}
          platforms={[size === "story" ? "story" : "whatsapp"]}
          getImage={blob}
          className={btn}
        />
      </div>
      {msg && <p className="mt-2 text-sm text-stone-600">{msg}</p>}

      <div className="mt-4 space-y-3">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="signup-names"
              className="text-xs font-medium text-stone-600"
            >
              Who&apos;s in
            </label>
            <span className="text-xs text-stone-400">{saved}</span>
          </div>
          <textarea
            id="signup-names"
            rows={8}
            value={list}
            disabled={!loaded}
            placeholder={loaded ? "Kai" : "Loading…"}
            onChange={(e) => {
              setSaved("");
              setPasted("");
              setList(e.target.value);
            }}
            onPaste={(e) => {
              // Messages pasted from WhatsApp: add the senders' first names.
              const found = namesFromChat(e.clipboardData.getData("text"));
              if (!found.length) return;
              e.preventDefault();
              const fresh = found.filter(
                (f) => !names.some((n) => n.toLowerCase() === f.toLowerCase()),
              );
              setSaved("");
              setList([...names, ...fresh].join("\n"));
              setPasted(
                fresh.length
                  ? `Added from the chat: ${fresh.join(", ")}`
                  : "Everyone in those messages is already on the list.",
              );
            }}
            className={input}
          />
          {pasted && (
            <p className="mt-1 text-xs font-medium text-pink-ink">{pasted}</p>
          )}
          <p className="mt-1 text-xs text-stone-500">
            Type names one per line, or paste replies straight from the WhatsApp
            chat: everyone who replied is added by first name (not people who
            only said they can&apos;t make it), so check the list after. Saved
            on the event, so other organisers see it too.
          </p>
          {missing.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSaved("");
                setList([...names, ...missing].join("\n"));
              }}
              className="mt-1 text-xs font-medium text-pink-ink hover:underline"
            >
              Add {missing.length} who said Going in the Hub
            </button>
          )}
        </div>
        {drafts.length > 0 && names.length > 0 && (
          <div>
            <p className="text-xs font-medium text-stone-600">
              Who&apos;s doing what
            </p>
            <ul className="mt-1 divide-y divide-stone-100 rounded-xl bg-stone-50 ring-1 ring-stone-200">
              {names.map((n) => (
                <li
                  key={n}
                  className="flex flex-wrap items-center gap-1.5 px-2.5 py-1.5"
                >
                  <span className="mr-1 min-w-16 text-sm font-semibold text-navy">
                    {n}
                  </span>
                  {drafts.map((d, i) => {
                    if (!d.label.trim()) return null;
                    const on = d.names.some(
                      (x) => x.toLowerCase() === n.toLowerCase(),
                    );
                    return (
                      <button
                        key={i}
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          setSaved("");
                          setDrafts(
                            drafts.map((x, k) =>
                              k !== i
                                ? x
                                : {
                                    ...x,
                                    names: on
                                      ? x.names.filter(
                                          (y) =>
                                            y.toLowerCase() !== n.toLowerCase(),
                                        )
                                      : [...x.names, n],
                                  },
                            ),
                          );
                        }}
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${on ? "bg-navy text-white ring-navy" : "bg-white text-stone-500 ring-stone-300 hover:text-navy"}`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-stone-500">
              Tap a role to give it to someone. People can have more than one.
            </p>
          </div>
        )}
        <div>
          <p className="text-xs font-medium text-stone-600">The roles</p>
          <div className="mt-1 space-y-1.5">
            {drafts.map((d, i) => {
              const set = (patch: Partial<Role>) => {
                setSaved("");
                setDrafts(
                  drafts.map((x, k) => (k === i ? { ...x, ...patch } : x)),
                );
              };
              return (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    aria-label="Emoji"
                    value={d.emoji}
                    onChange={(e) => set({ emoji: e.target.value })}
                    className="w-11 rounded-lg bg-white px-1.5 py-1.5 text-center text-sm ring-1 ring-stone-300"
                  />
                  <input
                    aria-label="Role"
                    value={d.label}
                    placeholder="Role"
                    onChange={(e) => set({ label: e.target.value })}
                    className="min-w-0 flex-1 rounded-lg bg-white px-2.5 py-1.5 text-sm text-navy ring-1 ring-stone-300"
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${d.label || "role"}`}
                    onClick={() => {
                      setSaved("");
                      setDrafts(drafts.filter((_, k) => k !== i));
                    }}
                    className="px-1 text-stone-400 hover:text-navy"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3">
            {drafts.length < 10 && (
              <button
                type="button"
                onClick={() => {
                  setSaved("");
                  setDrafts([...drafts, role("", "")]);
                }}
                className="text-xs font-medium text-pink-ink hover:underline"
              >
                + Add a role
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSaved("");
                setDrafts(DEFAULT_ROLES);
              }}
              className="text-xs text-stone-500 hover:text-navy hover:underline"
            >
              Back to the usual roles
            </button>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            The emoji only go in Copy as text.
          </p>
        </div>
        <label className="block text-xs font-medium text-stone-600">
          Spots in the numbered list
          <input
            type="number"
            min={1}
            max={60}
            value={target}
            onChange={(e) => {
              setSaved("");
              setTarget(Math.min(60, Math.max(1, Number(e.target.value) || 1)));
            }}
            className={`${input} w-24`}
          />
        </label>
        {field("kicker", "Small line")}
        {field("heading", "Heading")}
        {field("details", "Date, time and place")}
        {roles.length > 0 && field("rolesTitle", "Above the roles")}
        {roles.length > 0 &&
          field(
            "rolesNote",
            "Note after the roles (Copy as text only, optional)",
          )}
        {roles.length > 0 &&
          field("intro", "Opening line (Copy as text only, optional)")}
        {field("footer", "Bottom line")}
        <button
          type="button"
          onClick={() => setTexts(defaults(event, tz))}
          className="text-xs text-stone-500 hover:text-navy hover:underline"
        >
          Put the original words back
        </button>
      </div>
    </Sheet>
  );
}
