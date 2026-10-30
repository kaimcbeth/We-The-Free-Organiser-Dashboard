import type { NextRequest } from "next/server";
import { requireOrganiser } from "@/lib/organiser";

// The offline movie player, tied to the organiser's community: the survey
// answers it collects are sent to this community when the laptop is online.
export async function GET(request: NextRequest) {
  const { supabase, organiser } = await requireOrganiser();
  const teamId =
    organiser.allCommunities || organiser.exampleMode
      ? null
      : organiser.team_id;
  const res = await fetch(
    new URL("/resources/movie-player.html", request.nextUrl.origin),
    { cache: "no-store" },
  );
  let html = await res.text();
  const { data: token } = teamId
    ? await supabase.rpc("team_player_token", { p_team_id: teamId })
    : { data: null };
  const community = organiser.team.name.replace(
    /, (Australia|New Zealand)$/,
    "",
  );
  if (token) {
    const config = JSON.stringify({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      token,
      community,
    }).replace(/</g, "\\u003c");
    html = html.replace("/*WTF_CONFIG*/null", config);
  }
  const name = token
    ? `WTF Movie Player - ${community}.html`
    : "WTF Movie Player.html";
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name.replace(/[^\w .-]/g, "")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
