// God Mode only: get a one-time sign-in token for a TEST account, so God Mode
// can see the app exactly as that test person. Real accounts are refused.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: who } = await admin.auth.getUser(jwt);
  if (!who.user) return json({ error: "not signed in" }, 401);

  const { data: me } = await admin.from("organisers").select("access").eq("id", who.user.id).maybeSingle();
  if (me?.access !== "god") return json({ error: "God Mode only" }, 403);

  const { personId } = await req.json().catch(() => ({ personId: null }));
  const { data: person } = await admin
    .from("people")
    .select("email, is_test, user_id")
    .eq("id", personId)
    .maybeSingle();
  if (!person?.is_test || !person.email || !person.user_id) return json({ error: "Not a test account" }, 400);

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: person.email });
  if (error || !data?.properties?.hashed_token) return json({ error: "Couldn't make a sign-in link" }, 500);
  return json({ token_hash: data.properties.hashed_token });
});
