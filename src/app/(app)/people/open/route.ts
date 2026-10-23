import { NextResponse, type NextRequest } from "next/server";
import { getStaff, TEAM_COOKIE } from "@/lib/organiser";

// Open someone's profile from elsewhere (e.g. a check-in): switch to their
// community first so the profile shows in the right place.
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const team = request.nextUrl.searchParams.get("team") ?? "";
  const { organiser } = await getStaff();
  const url = request.nextUrl.clone();
  url.search = "";
  if (!organiser) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  url.pathname = /^[0-9a-f-]{36}$/i.test(id) ? `/people/${id}` : "/people";
  const res = NextResponse.redirect(url);
  if (organiser.teams.some((t) => t.id === team))
    res.cookies.set(TEAM_COOKIE, team, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  return res;
}
