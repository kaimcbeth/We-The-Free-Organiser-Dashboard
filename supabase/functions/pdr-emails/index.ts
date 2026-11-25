// PDR emails (Kai, 26 Nov 2026; 0256): the invite when a PDR is started
// (it's also the RSL's way into the Hub) and a reminder 3 days before the
// meeting if their draft isn't marked ready. Runs every 15 min (pg_cron
// `pdr-emails`) and right after Start (`private.pdr_kick_emails`).
// `pdr_emails_due()` says what's due; `pdr_mark_emailed` records it.

import { createClient } from "npm:@supabase/supabase-js@2";

const APP_URL =
  Deno.env.get("APP_URL") ?? "https://wtf-movement-hub.vercel.app";

type Due = {
  id: string;
  type: "invite" | "reminder";
  email: string;
  name: string;
  reviewer: string | null;
  kind: "annual" | "mid_year";
  year: number;
  meeting_at: string | null;
  timezone: string;
  token: string;
};

const esc = (s: string) =>
  s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );

function when(iso: string, tz: string) {
  const f = new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
  return `${f} (${tz.split("/").pop()?.replace(/_/g, " ")} time)`;
}

function build(d: Due) {
  const first = d.name.split(" ")[0];
  const reviewer = d.reviewer ?? "Your community manager";
  const review = `${d.kind === "annual" ? "annual" : "mid-year"} review`;
  const link = `${APP_URL}/pdr-invite/${d.token}`;
  const meeting = d.meeting_at ? when(d.meeting_at, d.timezone) : null;
  const lines =
    d.type === "invite"
      ? [
          `Hi ${first},`,
          `${reviewer} has started your ${review} (PDR) for ${d.year} on the Movement Hub.`,
          `A PDR is a supportive conversation about how things have gone, how you're feeling in the role, and your goals and growth for the coming months. It isn't disciplinary.`,
          `Please fill in your draft before the meeting. It saves as you go, so you can do it in bits.`,
          ...(meeting ? [`Meeting: ${meeting}`] : []),
        ]
      : [
          `Hi ${first},`,
          `Your PDR meeting with ${reviewer} is coming up${meeting ? `: ${meeting}` : ""}.`,
          `Your draft isn't marked ready yet. When you've filled it in, press "My draft is ready" so ${reviewer.split(" ")[0]} can add their notes before you meet.`,
        ];
  const button = d.type === "invite" ? "Open my PDR" : "Finish my draft";
  const subject =
    d.type === "invite"
      ? `Your ${d.year} ${review} is ready to fill in`
      : `Reminder: your PDR meeting is coming up`;
  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#0b1233">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
<div style="background:#0b1233;color:#fff;border-radius:16px 16px 0 0;padding:18px 22px;font-weight:bold;font-size:18px">We The Free · Movement Hub</div>
<div style="background:#fff;border-radius:0 0 16px 16px;padding:22px">
${lines.map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.5">${esc(l)}</p>`).join("")}
<p style="margin:20px 0 8px"><a href="${link}" style="display:inline-block;background:#f6a5c8;color:#0b1233;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:12px">${button}</a></p>
<p style="margin:16px 0 0;font-size:12px;color:#78716c">If you don't have a Movement Hub account yet, the link lets you make one with this email address.</p>
</div></div></body></html>`;
  const text = `${lines.join("\n\n")}\n\n${button}: ${link}`;
  return { subject, html, text };
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");
  if (!smtpUser || !smtpPass)
    return Response.json({ error: "email sender not set up" });
  const { data, error } = await supabase.rpc("pdr_emails_due");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const due = (data ?? []) as Due[];
  if (!due.length) return Response.json({ processed: 0 });

  const nodemailer = (await import("npm:nodemailer@6.9.16")).default;
  const mailer = nodemailer.createTransport({
    host: Deno.env.get("SMTP_HOST") ?? "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: smtpUser, pass: smtpPass },
  });
  const from = Deno.env.get("SMTP_FROM") ?? `We The Free <${smtpUser}>`;
  const results = [];
  for (const d of due) {
    try {
      const m = build(d);
      await mailer.sendMail({ from, to: d.email, ...m });
      await supabase.rpc("pdr_mark_emailed", { p_id: d.id, p_type: d.type });
      results.push({ id: d.id, type: d.type, sent: true });
    } catch (err) {
      results.push({
        id: d.id,
        type: d.type,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return Response.json({ processed: results.length, results });
});
