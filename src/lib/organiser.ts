import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Organiser = {
  id: string;
  team_id: string;
  name: string;
  email: string;
  role: "organiser" | "admin";
  team: { id: string; name: string; slug: string } | null;
};

// Returns the signed-in organiser, or sends them to the right place:
// signed out -> login; signed in but not an organiser -> their attendee profile.
export async function requireOrganiser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: organiser } = await supabase
    .from("organisers")
    .select("id, team_id, name, email, role, team:teams(id, name, slug)")
    .eq("id", user.id)
    .maybeSingle<Organiser>();

  if (!organiser) redirect("/me");

  return { supabase, user, organiser };
}
