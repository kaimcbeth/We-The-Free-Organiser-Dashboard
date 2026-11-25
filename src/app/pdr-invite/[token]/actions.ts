"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ClaimState = { error?: string };

const ERRORS: Record<string, string> = {
  login: "Please log in first.",
  invalid: "This link isn't valid. Ask your community manager for a new one.",
  used: "This PDR belongs to another account. Log in with the email the invite was sent to, or ask your community manager.",
  no_region:
    "Your account isn't set up as an RSL yet. Ask your community manager to sort it out.",
};

// Claim a PDR invite (0256): links the PDR to this account and, for someone
// new to the Hub, makes them the RSL for the PDR's region.
export async function claimPdr(
  _prev: ClaimState,
  formData: FormData,
): Promise<ClaimState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pdr_claim", {
    p_token: String(formData.get("token") ?? ""),
    p_name: String(formData.get("name") ?? ""),
  });
  if (error) return { error: "Something went wrong. Please try again." };
  const r = String(data ?? "");
  if (r.startsWith("ok:")) redirect(`/pdr/${r.slice(3)}`);
  return { error: ERRORS[r] ?? "Something went wrong." };
}
