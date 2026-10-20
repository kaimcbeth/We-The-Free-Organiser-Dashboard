import { NextResponse, type NextRequest } from "next/server";
import { getStaff, TEAM_COOKIE } from "@/lib/organiser";

// Open an event from the calendar: switch to that event's team first, so the
// event page shows the right team (and its time zone), then go to the event.
export async function GET(request: NextRequest) {
  const event = request.nextUrl.searchParams.get("event") ?? "";
  const team = request.nextUrl.searchParams.get("team") ?? "";
  const { organiser } = await getStaff();
  const url = request.nextUrl.clone();
  url.search = "";
  if (!organiser) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  url.pathname = /^[0-9a-f-]{36}$/i.test(event)
    ? `/events/${event}`
    : "/calendar";
  const res = NextResponse.redirect(url);
  if (organiser.teams.some((t) => t.id === team)) {
    res.cookies.set(TEAM_COOKIE, team, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return res;
}
