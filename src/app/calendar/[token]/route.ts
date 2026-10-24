import { createClient } from "@/lib/supabase/server";
import { icsFor, type CalEvent } from "@/lib/ics";

// A community's events as a calendar feed (Google Calendar subscribes to it).
// ?download=1 gives a file to save instead.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("calendar_feed", {
    p_token: token.replace(/\.ics$/, ""),
  });
  const feed = data as { team: string; events: CalEvent[] } | null;
  if (!feed) return new Response("Not found", { status: 404 });
  const name = `We The Free ${feed.team.replace(/, (Australia|New Zealand)$/, "")}`;
  const download = new URL(req.url).searchParams.has("download");
  return new Response(icsFor(feed.events, name), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=900",
      ...(download
        ? {
            "Content-Disposition": `attachment; filename="${name.replace(/[^\w ]/g, "")}.ics"`,
          }
        : {}),
    },
  });
}
