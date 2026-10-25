// Day-before reminders for volunteers who said they're Going. Runs hourly
// (pg_cron): for events starting 18–30 hours from now, each Going answer not
// yet reminded gets an in-app notification (the bell), plus an email or a
// phone notification if they chose one. Email needs SMTP_USER / SMTP_PASS.

import { createClient } from "npm:@supabase/supabase-js@2";

const APP_URL = Deno.env.get("APP_URL") ?? "https://wtf-organiser.vercel.app";

type Due = {
  event_id: string;
  person_id: string;
  event: {
    title: string;
    starts_at: string;
    venue: string | null;
    address: string | null;
    team: { timezone: string } | null;
  } | null;
  person: {
    first_name: string;
    user_id: string | null;
    email: string | null;
    notify_channel: string;
  } | null;
};

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = Date.now();
  const { data: due, error } = await supabase
    .from("event_rsvps")
    .select(
      "event_id, person_id, event:events!inner(title, starts_at, venue, address, team:teams(timezone)), person:people(first_name, user_id, email, notify_channel)",
    )
    .eq("status", "going")
    .is("reminded_at", null)
    .gte("event.starts_at", new Date(now + 18 * 36e5).toISOString())
    .lte("event.starts_at", new Date(now + 30 * 36e5).toISOString())
    .limit(500)
    .returns<Due[]>();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");
  // deno-lint-ignore no-explicit-any
  let mailer: any = null;
  async function getMailer() {
    if (!smtpUser || !smtpPass) return null;
    if (!mailer) {
      const nodemailer = (await import("npm:nodemailer@6.9.16")).default;
      mailer = nodemailer.createTransport({
        host: Deno.env.get("SMTP_HOST") ?? "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: smtpUser, pass: smtpPass },
      });
    }
    return mailer;
  }
  // deno-lint-ignore no-explicit-any
  let push: any = null;
  async function getPush() {
    if (!push) {
      const { data: keys } = await supabase
        .from("app_settings")
        .select("name, value")
        .in("name", ["vapid_public_key", "vapid_private_key", "vapid_subject"]);
      const k = Object.fromEntries((keys ?? []).map((r) => [r.name, r.value]));
      if (!k.vapid_public_key || !k.vapid_private_key) return null;
      const webpush = (await import("npm:web-push@3.6.7")).default;
      webpush.setVapidDetails(k.vapid_subject ?? "mailto:hello@activism.wtf", k.vapid_public_key, k.vapid_private_key);
      push = webpush;
    }
    return push;
  }

  const results: Record<string, unknown>[] = [];
  for (const r of due ?? []) {
    const ev = r.event;
    const p = r.person;
    const result: Record<string, unknown> = { event: r.event_id, person: r.person_id };
    const mark = () =>
      supabase.from("event_rsvps").update({ reminded_at: new Date().toISOString() })
        .eq("event_id", r.event_id).eq("person_id", r.person_id);
    if (!ev || !p?.user_id) {
      await mark();
      results.push({ ...result, skipped: "no login" });
      continue;
    }
    const tz = ev.team?.timezone ?? "Australia/Sydney";
    const when = new Intl.DateTimeFormat("en-AU", {
      timeZone: tz, weekday: "long", hour: "numeric", minute: "2-digit",
    }).format(new Date(ev.starts_at));
    const where = ev.venue ?? ev.address;
    const title = `Tomorrow: ${ev.title}`;
    const body = `See you ${when}${where ? ` at ${where}` : ""}. Can't make it any more? Let us know in the app.`;
    const url = "/me";

    await supabase.from("notifications").insert({ user_id: p.user_id, kind: "event_reminder", title, body, url });
    result.inApp = true;
    try {
      if (p.notify_channel === "email" && p.email) {
        const m = await getMailer();
        if (m) {
          await m.sendMail({
            from: Deno.env.get("SMTP_FROM") ?? `We The Free <${smtpUser}>`,
            to: p.email,
            subject: title,
            text: `Hi ${p.first_name},\n\n${body}\n\n${APP_URL}${url}\n\nWe The Free`,
            html: `<p>Hi ${esc(p.first_name)},</p><p>${esc(body)}</p><p><a href="${APP_URL}${url}">Open the app</a></p><p>We The Free</p>`,
          });
          result.email = "sent";
        } else result.email = "email sender not set up";
      } else if (p.notify_channel === "push") {
        const wp = await getPush();
        if (wp) {
          const { data: subs } = await supabase
            .from("push_subscriptions")
            .select("id, endpoint, p256dh, auth")
            .eq("user_id", p.user_id);
          let sent = 0;
          for (const s of subs ?? []) {
            try {
              await wp.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                JSON.stringify({ title, body, url }),
              );
              sent++;
            } catch (err) {
              const code = (err as { statusCode?: number }).statusCode;
              if (code === 404 || code === 410) await supabase.from("push_subscriptions").delete().eq("id", s.id);
            }
          }
          result.push = `${sent} sent`;
        }
      }
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
    }
    await mark();
    results.push(result);
  }
  return Response.json({ processed: results.length, results });
});
