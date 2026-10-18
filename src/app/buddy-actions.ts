"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// "I'll be their buddy"
export async function claimNewcomer(newcomerId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_newcomer", { p_newcomer_id: newcomerId });
  if (error) return { error: "Couldn't save. Please try again." };
  if (data === "taken") return { error: "Someone else just became their buddy." };
  if (data === "not_a_buddy") return { error: "Only approved buddies can do this. Ask an organiser." };
  if (data !== "ok") return { error: "Couldn't find that person." };
  revalidatePath("/me");
  return {};
}

// "Done, I've invited them"
export async function completePrompt(promptId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_buddy_prompt", { p_prompt_id: promptId });
  if (error || !data) return { error: "Couldn't save. Please try again." };
  revalidatePath("/me");
  return {};
}

// How the buddy wants reminders on top of the in-app bell.
export async function setNotifyChannel(channel: "none" | "email" | "push"): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_my_notify_channel", { p_channel: channel });
  if (error || !data) return { error: "Couldn't save. Please try again." };
  revalidatePath("/me");
  return {};
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  revalidatePath("/notifications");
}
