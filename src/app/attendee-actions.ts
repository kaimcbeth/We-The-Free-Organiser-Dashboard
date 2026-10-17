"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type JoinState = { error?: string; namesTaken?: string[] };

// General sign-up (the team QR code).
export async function joinTeam(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const supabase = await createClient();
  const team = String(formData.get("team") ?? "");
  const first = String(formData.get("first_name") ?? "").trim();
  if (!first) return { error: "Please add your first name." };

  const { data, error } = await supabase.rpc("join_team", {
    p_team_slug: team,
    p_first: first,
    p_last: String(formData.get("last_name") ?? ""),
    p_phone: String(formData.get("phone") ?? ""),
    p_suburb: String(formData.get("suburb") ?? ""),
    p_consent: formData.get("consent") === "on",
    p_force_new: formData.get("force_new") === "true",
  });

  if (error) return { error: "Something went wrong. Please try again." };
  const result = data as { status: string; names?: string[] };

  if (result.status === "name_taken") return { namesTaken: result.names ?? [] };
  if (result.status === "not_signed_in") redirect(`/join/${team}`);
  if (result.status !== "linked") return { error: "Something went wrong. Please try again." };

  redirect("/me?welcome=1");
}

export type ClaimState = { error?: string };

// Personal invite link / QR code.
export async function claimInvite(_prev: ClaimState, formData: FormData): Promise<ClaimState> {
  const supabase = await createClient();
  const token = String(formData.get("token") ?? "");
  const { data, error } = await supabase.rpc("claim_invite", { p_token: token });
  if (error) return { error: "Something went wrong. Please try again." };

  switch (data as string) {
    case "ok":
      redirect("/me?welcome=1");
    case "used":
      return { error: "This invite has already been used. Ask an organiser for a new one." };
    case "expired":
      return { error: "This invite has expired. Ask an organiser to show you a new QR code." };
    case "already_linked":
      return {
        error:
          "Your login is already connected to a different profile. Ask an organiser to sort it out for you.",
      };
    default:
      return { error: "This invite isn't valid. Ask an organiser for a new one." };
  }
}

export type ProfileState = { error?: string; saved?: boolean };

export async function updateMyProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_my_profile", {
    p_person_id: String(formData.get("person_id") ?? ""),
    p_first: String(formData.get("first_name") ?? ""),
    p_last: String(formData.get("last_name") ?? ""),
    p_phone: String(formData.get("phone") ?? ""),
    p_suburb: String(formData.get("suburb") ?? ""),
    p_consent: formData.get("consent") === "on",
  });
  if (error || !data) return { error: "Couldn't save your details. Please try again." };
  revalidatePath("/me");
  return { saved: true };
}
