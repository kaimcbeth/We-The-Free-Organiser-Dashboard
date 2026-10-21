import { NextResponse, type NextRequest } from "next/server";

// Events: switch between the list and the calendar, and remember the choice.
export async function GET(request: NextRequest) {
  const view =
    request.nextUrl.searchParams.get("v") === "calendar" ? "calendar" : "list";
  const url = request.nextUrl.clone();
  url.search = "";
  url.pathname = view === "calendar" ? "/calendar" : "/";
  const res = NextResponse.redirect(url);
  res.cookies.set("events_view", view, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}
