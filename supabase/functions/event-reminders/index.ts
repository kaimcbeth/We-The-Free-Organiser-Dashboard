// Event reminders. Runs hourly (pg_cron). `reminders_due()` (0169) says who
// gets what:
//   going    – the day before an event you're Going to (always)
//   upcoming – about 3 days before an event you haven't answered (if chosen)
// Both follow the person's choice of event kinds (`event_kind()`, 0172).
// No Maybe answers since 0173 (Kai, 4 Nov 2026). Each gets an in-app notification (the bell), plus an email or a
// phone notification or text if they chose one. Email needs SMTP_USER /
// SMTP_PASS; texts need CLICKSEND_USER / CLICKSEND_KEY (+ SMS_FROM).

import { createClient } from "npm:@supabase/supabase-js@2";

const APP_URL = Deno.env.get("APP_URL") ?? "https://wtf-organiser.vercel.app";

type Due = {
  kind: "going" | "upcoming";
  event_id: string;
  person_id: string;
  title: string;
  starts_at: string;
  venue: string | null;
  address: string | null;
  timezone: string;
  first_name: string;
  user_id: string | null;
  email: string | null;
  notify_channel: string;
  phone: string | null;
};

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function words(r: Due) {
  const when = new Intl.DateTimeFormat("en-AU", {
    timeZone: r.timezone, weekday: "long", hour: "numeric", minute: "2-digit",
  }).format(new Date(r.starts_at));
  const day = new Intl.DateTimeFormat("en-AU", {
    timeZone: r.timezone, weekday: "long", day: "numeric", month: "long",
  }).format(new Date(r.starts_at));
  const time = new Intl.DateTimeFormat("en-AU", {
    timeZone: r.timezone, hour: "numeric", minute: "2-digit",
  }).format(new Date(r.starts_at));
  const where = r.venue ?? r.address;
  const at = where ? ` at ${where}` : "";
  if (r.kind === "going")
    return {
      title: `Tomorrow: ${r.title}`,
      body: `See you ${when}${at}. Can't make it any more? Let us know in the app.`,
    };
  return {
    title: `Coming up: ${r.title}`,
    body: `${day}, ${time}${at}. Are you coming? Tap Going or Can't in the app.`,
  };
}

// Phone number in international form for ClickSend: strips spaces and
// invisible characters; local Australian / NZ numbers get +61 / +64.
function intl(phone: string, timezone: string) {
  const d = phone.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return d;
  if (d.startsWith("00")) return "+" + d.slice(2);
  const cc = timezone.startsWith("Pacific/Auckland") ? "64" : timezone.startsWith("Australia/") ? "61" : null;
  if (cc && d.startsWith("0")) return "+" + cc + d.slice(1);
  return cc ? "+" + cc + d : "+" + d;
}

// Send one text through ClickSend. Username + API key (Basic auth); if
// that's refused, the key is tried as a Bearer token.
async function sendSms(to: string, body: string) {
  const user = Deno.env.get("CLICKSEND_USER");
  const key = Deno.env.get("CLICKSEND_KEY");
  if (!key) return { ok: false, error: "text sender not set up" };
  const from = (Deno.env.get("SMS_FROM") ?? "").replace(/\s+/g, "").slice(0, 11);
  const payload = JSON.stringify({
    messages: [{ source: "movementhub", body, to, ...(from ? { from } : {}) }],
  });
  const post = (auth: string) =>
    fetch("https://rest.clicksend.com/v3/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: payload,
    });
  let res = user ? await post("Basic " + btoa(`${user}:${key}`)) : null;
  if (!res || res.status === 401) res = await post("Bearer " + key);
  const json = await res.json().catch(() => null);
  const msg = json?.data?.messages?.[0];
  const ok = res.ok && (!msg || msg.status === "SUCCESS");
  return ok ? { ok: true } : { ok: false, error: msg?.status ?? json?.response_msg ?? `HTTP ${res.status}` };
}

Deno.serve(async (req) => {
  const reqBody = await req.json().catch(() => null);
  const test = reqBody?.test === true;
  const smsTest = reqBody?.smsTest === true;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");
  const from = () => Deno.env.get("SMTP_FROM") ?? `We The Free <${smtpUser}>`;
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

  // Test (Kai, 4 Nov 2026): POST {"test": true} sends one sample reminder to
  // the sending address itself (SMTP_USER), and nothing to anyone else.
  if (test) {
    const m = await getMailer();
    if (!m) return Response.json({ test: "email sender not set up" });
    try {
      await m.sendMail({
        from: from(),
        to: smtpUser,
        subject: "Tomorrow: Test event (Movement Hub test)",
        text: `Hi Kai,\n\nThis is a test of the Movement Hub's day-before reminder email. If you can read this, it works.\n\n${APP_URL}/me\n\nWe The Free`,
        html: `<p>Hi Kai,</p><p>This is a test of the Movement Hub's day-before reminder email. If you can read this, it works.</p><p><a href="${APP_URL}/me">Open the app</a></p><p>We The Free</p>`,
      });
      return Response.json({ test: "sent", to: smtpUser });
    } catch (err) {
      return Response.json({ test: "failed", error: err instanceof Error ? err.message : String(err) });
    }
  }

  // Text test (Kai, 4 Nov 2026): POST {"smsTest": true} texts God accounts'
  // own phones only (sms_test_recipients), nobody else.
  if (smsTest) {
    const { data: to } = await supabase.rpc("sms_test_recipients")
      .returns<{ first_name: string; phone: string; timezone: string }[]>();
    const sent = [];
    for (const r of to ?? []) {
      sent.push(await sendSms(intl(r.phone, r.timezone),
        `Hi ${r.first_name}, this is a test text from the Movement Hub. Event reminders by text are working. - We The Free`));
    }
    return Response.json({ smsTest: sent.length ? sent : "no God account has a phone number" });
  }

  const { data: due, error } = await supabase.rpc("reminders_due").returns<Due[]>();
  if (error) return Response.json({ error: error.message }, { status: 500 });

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
    const result: Record<string, unknown> = { kind: r.kind, event: r.event_id, person: r.person_id };
    const mark = () =>
      r.kind === "upcoming"
        ? supabase.from("event_heads_up").upsert({ event_id: r.event_id, person_id: r.person_id })
        : supabase.from("event_rsvps").update({ reminded_at: new Date().toISOString() })
          .eq("event_id", r.event_id).eq("person_id", r.person_id);
    if (!r.user_id) {
      await mark();
      results.push({ ...result, skipped: "no login" });
      continue;
    }
    const { title, body } = words(r);
    const url = "/me";

    await supabase.from("notifications").insert({ user_id: r.user_id, kind: "event_reminder", title, body, url });
    result.inApp = true;
    try {
      if (r.notify_channel === "email" && r.email) {
        const m = await getMailer();
        if (m) {
          await m.sendMail({
            from: from(),
            to: r.email,
            subject: title,
            text: `Hi ${r.first_name},\n\n${body}\n\n${APP_URL}${url}\n\nWe The Free`,
            html: `<p>Hi ${esc(r.first_name)},</p><p>${esc(body)}</p><p><a href="${APP_URL}${url}">Open the app</a></p><p>We The Free</p>`,
          });
          result.email = "sent";
        } else result.email = "email sender not set up";
      } else if (r.notify_channel === "sms" && r.phone) {
        // Short, one text (160 characters) where possible; no link.
        const sms = await sendSms(intl(r.phone, r.timezone), `${title}. ${body}`.slice(0, 300));
        result.sms = sms.ok ? "sent" : sms.error;
      } else if (r.notify_channel === "push") {
        const wp = await getPush();
        if (wp) {
          const { data: subs } = await supabase
            .from("push_subscriptions")
            .select("id, endpoint, p256dh, auth")
            .eq("user_id", r.user_id);
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
