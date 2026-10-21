"use server";

import { revalidatePath } from "next/cache";
import { requireOrganiser } from "@/lib/organiser";

export type GroupInput = {
  id?: string;
  teamId: string | null;
  name: string;
  url: string;
  category: string;
  members: number | null;
  notes: string;
};

// Facebook links come in many shapes; keep the group's own address.
function cleanUrl(raw: string) {
  let url = raw.trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    if (u.hostname === "m.facebook.com" || u.hostname === "web.facebook.com")
      u.hostname = "www.facebook.com";
    return u.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

async function requireGod() {
  const { supabase, organiser } = await requireOrganiser();
  if (organiser.access !== "god") return null;
  return supabase;
}

export async function saveFacebookGroup(
  g: GroupInput,
): Promise<{ error?: string }> {
  const supabase = await requireGod();
  if (!supabase) return { error: "God Mode only." };
  const name = g.name.trim();
  const url = cleanUrl(g.url);
  if (!name) return { error: "Give the group a name." };
  if (!url) return { error: "Paste the group's link." };
  const row = {
    team_id: g.teamId || null,
    name,
    url,
    category: g.category,
    members: g.members,
    notes: g.notes.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = g.id
    ? await supabase.from("facebook_groups").update(row).eq("id", g.id)
    : await supabase.from("facebook_groups").insert(row);
  if (error)
    return {
      error:
        error.code === "23505"
          ? "That group is already in the list."
          : "Couldn't save it. Please try again.",
    };
  revalidatePath("/facebook-groups");
  return {};
}

export async function removeFacebookGroup(
  id: string,
): Promise<{ error?: string }> {
  const supabase = await requireGod();
  if (!supabase) return { error: "God Mode only." };
  const { error } = await supabase
    .from("facebook_groups")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: "Couldn't remove it. Please try again." };
  revalidatePath("/facebook-groups");
  return {};
}
