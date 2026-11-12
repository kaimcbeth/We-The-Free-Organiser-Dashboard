// Monday email summary for organisers (Kai, 12 Nov 2026). Runs hourly
// (pg_cron `weekly-summary`); `weekly_summaries_due()` (0228) says who is due
// (Monday from 7 am in the community's timezone, once a week, can be switched
// off in Reminders). POST {"test": true} sends Kai's summary to SMTP_USER only.

import { createClient } from "npm:@supabase/supabase-js@2";

const APP_URL = Deno.env.get("APP_URL") ?? "https://wtf-movement-hub.vercel.app";

type Summary = {
  last: { events: number; checkins: number; films: number };
  newcomers: string[];
  coming: { id: string; title: string; starts_at: string; going: number }[];
  overdue: number;
  due: number;
  birthdays: string[];
};
type Row = {
  user_id: string;
  email: string;
  first_name: string;
  team_id: string;
  team_name: string;
  timezone: string;
  week_start: string;
  summary: Summary;
};

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const list = (xs: string[]) =>
  xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

function build(r: Row) {
  const s = r.summary;
  const city = r.team_name.split(",")[0];
  const when = (iso: string) =>
    new Intl.DateTimeFormat("en-AU", {
      timeZone: r.timezone, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
    }).format(new Date(iso));

  // Each section: heading + lines (plain text), link
  const sections: { head: string; lines: string[]; link?: [string, string] }[] = [];

  const last: string[] = [];
  if (s.last.events === 0) last.push("No events last week.");
  else {
    last.push(`${plural(s.last.events, "event")}, ${plural(s.last.checkins, "check-in")}.`);
    if (s.last.films > 0) last.push(`${plural(s.last.films, "film")} watched.`);
  }
  if (s.newcomers.length)
    last.push(`${plural(s.newcomers.length, "first-timer")}: ${list(s.newcomers)}. A quick hello goes a long way.`);
  sections.push({ head: "Last week", lines: last, link: s.newcomers.length ? ["See the newcomers", "/"] : undefined });

  sections.push({
    head: "This week",
    lines: s.coming.length
      ? s.coming.map((e) => `${when(e.starts_at)}: ${e.title}${e.going ? ` (${e.going} going)` : ""}`)
      : ["Nothing on the calendar this week."],
    link: ["Open Events", "/"],
  });

  const acts: string[] = [];
  if (s.due) acts.push(`${plural(s.due, "action")} due this week.`);
  if (s.overdue) acts.push(`${plural(s.overdue, "action")} overdue. Tick off or dismiss what's done.`);
  if (!acts.length) acts.push("Nothing due. Nice work.");
  sections.push({ head: "Actions", lines: acts, link: ["Open Actions", "/tasks"] });

  if (s.birthdays.length)
    sections.push({ head: "Birthdays", lines: [`${list(s.birthdays)} ${s.birthdays.length === 1 ? "has a birthday" : "have birthdays"} this week.`] });

  const subject = `Your week at WTF ${city}`;
  const text =
    `Hi ${r.first_name},\n\nHere's your week at We The Free ${city}.\n\n` +
    sections.map((x) => `${x.head.toUpperCase()}\n${x.lines.join("\n")}${x.link ? `\n${APP_URL}${x.link[1]}` : ""}`).join("\n\n") +
    `\n\nDon't want these? Turn off the Monday summary in Reminders on the Events tab.\n\nWe The Free`;

  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f8;font-family:Arial,Helvetica,sans-serif;color:#0f1b3d">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="background:#0f1b3d;border-radius:16px;padding:22px 24px;color:#fff">
<div style="color:#ff4fb4;font-weight:bold;font-size:12px;letter-spacing:2px">YOUR WEEK</div>
<div style="font-size:24px;font-weight:bold;margin-top:4px">We The Free ${esc(city)}</div>
<div style="color:#c9cee0;font-size:14px;margin-top:6px">Hi ${esc(r.first_name)}, here's where things are at.</div>
</div>
${sections
  .map(
    (x) => `<div style="background:#fff;border-radius:14px;padding:18px 22px;margin-top:12px">
<div style="font-weight:bold;font-size:13px;letter-spacing:1px;color:#e8399f;text-transform:uppercase">${esc(x.head)}</div>
${x.lines.map((l) => `<div style="font-size:15px;line-height:1.5;margin-top:6px">${esc(l)}</div>`).join("")}
${x.link ? `<div style="margin-top:10px"><a href="${APP_URL}${x.link[1]}" style="color:#0f1b3d;font-weight:bold;font-size:14px">${esc(x.link[0])} &rarr;</a></div>` : ""}
</div>`,
  )
  .join("")}
<p style="font-size:12px;color:#6b7280;margin-top:18px;text-align:center">Don't want these? Turn off the Monday summary in Reminders on the Events tab.</p>
</div></body></html>`;
  return { subject, text, html };
}

Deno.serve(async (req) => {
  const body = await req.json().catch(() => null);
  const test = body?.test === true;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");
  if (!smtpUser || !smtpPass) return Response.json({ error: "email sender not set up" });
  const nodemailer = (await import("npm:nodemailer@6.9.16")).default;
  const mailer = nodemailer.createTransport({
    host: Deno.env.get("SMTP_HOST") ?? "smtp.gmail.com", port: 465, secure: true,
    auth: { user: smtpUser, pass: smtpPass },
  });
  const from = Deno.env.get("SMTP_FROM") ?? `We The Free <${smtpUser}>`;

  const { data, error } = await supabase.rpc("weekly_summaries_due", { p_force: test }).returns<Row[]>();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (test) {
    const r = (data ?? []).find((x) => x.email === smtpUser || x.first_name === "Kai") ?? data?.[0];
    if (!r) return Response.json({ test: "nobody to summarise" });
    const m = build(r);
    await mailer.sendMail({ from, to: smtpUser, subject: m.subject + " (test)", text: m.text, html: m.html });
    return Response.json({ test: "sent", to: smtpUser, team: r.team_name });
  }

  const results = [];
  for (const r of data ?? []) {
    try {
      const m = build(r);
      await mailer.sendMail({ from, to: r.email, subject: m.subject, text: m.text, html: m.html });
      await supabase.from("weekly_summary_sent").insert({ user_id: r.user_id, team_id: r.team_id, week_start: r.week_start });
      results.push({ team: r.team_name, sent: true });
    } catch (err) {
      results.push({ team: r.team_name, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return Response.json({ processed: results.length, results });
});
