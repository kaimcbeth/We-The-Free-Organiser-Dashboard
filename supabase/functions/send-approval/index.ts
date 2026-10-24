// Sends a police/council notice (PDF made in the browser) for an event.
// The recipient always comes from approval_authorities for the event's
// community, never from the browser. The sender is CC'd and set as reply-to,
// so the police reply straight to them. "test" sends only to the sender.
//
// Needs the same Edge Function secrets as buddy-reminders:
//   SMTP_USER, SMTP_PASS, and optionally SMTP_FROM, SMTP_HOST.

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const auth = req.headers.get("Authorization") ?? "";
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const {
      data: { user },
    } = await asUser.auth.getUser();
    if (!user?.email) return json({ error: "Please log in again." }, 401);

    const { eventId, pdfBase64, subject, body, test, filename } = await req.json();
    if (!eventId || !pdfBase64 || !subject || !body) return json({ error: "Something's missing." }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: event } = await admin
      .from("events")
      .select("id, team_id, team:teams(region_id)")
      .eq("id", eventId)
      .maybeSingle();
    if (!event) return json({ error: "Couldn't find that event." }, 404);

    // Organisers and Core Team of that community (and RSLs / God Mode).
    const { data: me } = await admin
      .from("organisers")
      .select("access, team_id, region_id")
      .eq("id", user.id)
      .maybeSingle();
    // deno-lint-ignore no-explicit-any
    const region = (event.team as any)?.region_id ?? null;
    const allowed =
      !!me &&
      (me.access === "god" ||
        ((me.access === "organiser" || me.access === "core_team") && me.team_id === event.team_id) ||
        (me.access === "regional_lead" && me.region_id && me.region_id === region));
    if (!allowed) return json({ error: "You can't send this for that community." }, 403);

    const { data: authority } = await admin
      .from("approval_authorities")
      .select("email, cc")
      .eq("team_id", event.team_id)
      .maybeSingle();
    if (!authority && !test) return json({ error: "No police or council address is set up for this community yet." }, 400);

    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");
    if (!smtpUser || !smtpPass) return json({ error: "Email sending isn't set up yet." }, 500);
    const nodemailer = (await import("npm:nodemailer@6.9.16")).default;
    const mailer = nodemailer.createTransport({
      host: Deno.env.get("SMTP_HOST") ?? "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const to = test ? user.email : authority!.email;
    const cc = test ? [] : [user.email, ...(authority!.cc ?? [])];
    const name = (filename as string | undefined)?.replace(/[^\w .-]/g, "") || "Notice.pdf";
    await mailer.sendMail({
      from: Deno.env.get("SMTP_FROM") ?? `We The Free <${smtpUser}>`,
      to,
      cc,
      replyTo: user.email,
      subject: test ? `[TEST] ${subject}` : subject,
      text: body,
      attachments: [{ filename: name, content: pdfBase64, encoding: "base64", contentType: "application/pdf" }],
    });

    // Keep a copy and a record.
    const path = `${event.team_id}/${event.id}/${Date.now()}${test ? "-test" : ""}.pdf`;
    const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
    await admin.storage.from("approvals").upload(path, bytes, { contentType: "application/pdf" });
    await admin.from("approval_submissions").insert({
      team_id: event.team_id,
      event_id: event.id,
      sent_by: user.id,
      sent_to: [to, ...cc].join(", "),
      test: !!test,
      pdf_path: path,
    });

    // The real thing ticks off the action (or records it if it hasn't shown up yet).
    if (!test) {
      const { data: task } = await admin
        .from("tasks")
        .select("id")
        .eq("event_id", event.id)
        .eq("kind", "approval_submitted")
        .maybeSingle();
      if (task)
        await admin
          .from("tasks")
          .update({ done_at: new Date().toISOString(), done_by: user.id, dismissed_at: null })
          .eq("id", task.id);
      else
        await admin.from("tasks").insert({
          team_id: event.team_id,
          event_id: event.id,
          kind: "approval_submitted",
          due_at: new Date().toISOString(),
          done_at: new Date().toISOString(),
          done_by: user.id,
        });
    }
    return json({ ok: true, to, cc });
  } catch (e) {
    console.error(e);
    return json({ error: "Couldn't send it. Please try again." }, 500);
  }
});
