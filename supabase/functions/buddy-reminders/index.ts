// Turns due buddy prompts into notifications. Runs every hour (pg_cron).
// Always adds an in-app notification (the bell); also sends an email or a
// phone notification if the buddy chose one.
//
// Email needs these Edge Function secrets (Google Workspace via an app password):
//   SMTP_USER, SMTP_PASS, and optionally SMTP_FROM ("We The Free <x@activism.wtf>")
// Supabase blocks port 587, so this uses Gmail's SSL port 465.

import { createClient } from "npm:@supabase/supabase-js@2";

const APP_URL = Deno.env.get("APP_URL") ?? "https://wtf-organiser.vercel.app";

type DuePrompt = {
  id: string;
  kind: string;
  pairing: {
    id: string;
    team_id: string;
    ended_at: string | null;
    newcomer: { first_name: string } | null;
    buddy: { first_name: string; user_id: string | null; email: string | null; notify_channel: string } | null;
  } | null;
};

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: due, error } = await supabase
    .from("buddy_prompts")
    .select(
      "id, kind, pairing:buddy_pairings!inner(id, team_id, ended_at, newcomer:people!buddy_pairings_newcomer_id_fkey(first_name), buddy:people!buddy_pairings_buddy_id_fkey(first_name, user_id, email, notify_channel))",
    )
    .is("done_at", null)
    .is("notified_at", null)
    .lte("due_at", new Date().toISOString())
    .limit(200)
    .returns<DuePrompt[]>();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Next upcoming event per team, to suggest in the invite.
  const nextEvent = new Map<string, { title: string; starts_at: string; venue: string | null } | null>();
  async function nextFor(teamId: string) {
    if (!nextEvent.has(teamId)) {
      const { data } = await supabase
        .from("events")
        .select("title, starts_at, venue, address")
        .eq("team_id", teamId)
        .gt("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(1)
        .maybeSingle();
      nextEvent.set(teamId, data ? { title: data.title, starts_at: data.starts_at, venue: data.venue ?? data.address } : null);
    }
    return nextEvent.get(teamId)!;
  }

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

  for (const p of due ?? []) {
    const pairing = p.pairing;
    const buddy = pairing?.buddy;
    const newcomer = pairing?.newcomer?.first_name ?? "your newcomer";
    const result: Record<string, unknown> = { prompt: p.id };

    // Pairing ended or buddy has no login: nothing to send, just close it off.
    if (!pairing || pairing.ended_at || !buddy?.user_id) {
      await supabase.from("buddy_prompts").update({ notified_at: new Date().toISOString() }).eq("id", p.id);
      results.push({ ...result, skipped: "no active buddy login" });
      continue;
    }

    const next = await nextFor(pairing.team_id);
    const title = `Invite ${newcomer} to an upcoming event`;
    const body = next
      ? `It's been a week since you became ${newcomer}'s buddy. How about ${next.title}${next.venue ? ` at ${next.venue}` : ""}, ${when(next.starts_at)}?`
      : `It's been a week since you became ${newcomer}'s buddy. Send them a friendly invite to the next event.`;
    const url = "/me#buddies";

    await supabase.from("notifications").insert({ user_id: buddy.user_id, kind: "buddy_invite", title, body, url });
    result.inApp = true;

    try {
      if (buddy.notify_channel === "email" && buddy.email) {
        const m = await getMailer();
        if (m) {
          await m.sendMail({
            from: Deno.env.get("SMTP_FROM") ?? `We The Free <${smtpUser}>`,
            to: buddy.email,
            subject: title,
            text: `Hi ${buddy.first_name},\n\n${body}\n\nOpen the app: ${APP_URL}${url}\n\nWe The Free`,
            html: `<p>Hi ${buddy.first_name},</p><p>${body}</p><p><a href="${APP_URL}${url}">Open your buddy list</a></p><p>We The Free</p>`,
          });
          result.email = "sent";
        } else result.email = "email sender not set up";
      } else if (buddy.notify_channel === "push") {
        const wp = await getPush();
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("user_id", buddy.user_id);
        let sent = 0;
        for (const s of subs ?? []) {
          try {
            await wp.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({ title, body, url }),
            );
            sent++;
          } catch (err) {
            // Subscription gone (phone uninstalled / permission removed): forget it.
            const code = (err as { statusCode?: number }).statusCode;
            if (code === 404 || code === 410) await supabase.from("push_subscriptions").delete().eq("id", s.id);
          }
        }
        result.push = `${sent} sent`;
      }
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
    }

    await supabase.from("buddy_prompts").update({ notified_at: new Date().toISOString() }).eq("id", p.id);
    results.push(result);
  }

  return Response.json({ processed: results.length, results });
});
