import { redirect } from "next/navigation";

// The Outreach guide moved to /guide (public, so newcomers can scan for it).
export default function OldGuidePage() {
  redirect("/guide");
}
