"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type StartState = { error?: string };

const ERRORS: Record<string, string> = {
  login: "Please log in first.",
  invalid: "This link isn't valid. Ask whoever sent it for a new one.",
  used: "This link has already been used. Ask whoever sent it for a new one.",
  expired: "This link has expired. Ask whoever sent it for a new one.",
  name: "Please add your name.",
  has_role:
    "Your account already has a role on the Movement Hub. Ask whoever sent the link to sort it out.",
};

export async function claimRoleInvite(
  _prev: StartState,
  formData: FormData,
): Promise<StartState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_role_invite", {
    p_token: String(formData.get("token") ?? ""),
    p_name: String(formData.get("name") ?? ""),
  });
  if (error) return { error: "Something went wrong. Please try again." };
  if (data === "ok") redirect("/");
  return { error: ERRORS[data as string] ?? "Something went wrong." };
}
