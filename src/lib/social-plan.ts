import { createClient } from "@/lib/supabase/client";

// Social media planner (0188): quick notes and banked posts on days of the
// calendar. Images live in the private "social-plan" bucket under the team.

export type PlanPlatform = "instagram" | "facebook" | "whatsapp" | "story";

export const PLAN_PLATFORMS: { id: PlanPlatform; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "story", label: "Story" },
];

export type PlanItem = {
  id: string;
  team_id: string;
  day: string; // yyyy-mm-dd
  note: string | null;
  caption: string | null;
  platforms: string[];
  image_paths: string[];
  event_id: string | null;
  posted_at: string | null;
  created_at: string;
};

export const PLAN_COLUMNS =
  "id, team_id, day, note, caption, platforms, image_paths, event_id, posted_at, created_at";

// Just a quick note so far, nothing ready to post.
export const isPlaceholder = (p: PlanItem) =>
  !p.caption?.trim() && p.image_paths.length === 0;

export async function uploadPlanImage(teamId: string, blob: Blob) {
  const ext = blob.type === "image/jpeg" ? "jpg" : "png";
  const path = `${teamId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient()
    .storage.from("social-plan")
    .upload(path, blob, { contentType: blob.type || "image/png" });
  if (error) throw error;
  return path;
}

export async function savePlanItem(p: {
  teamId: string;
  day: string;
  note?: string | null;
  caption?: string | null;
  platforms?: string[];
  images?: Blob[];
  eventId?: string | null;
}) {
  const paths: string[] = [];
  for (const b of p.images ?? [])
    paths.push(await uploadPlanImage(p.teamId, b));
  const { data, error } = await createClient()
    .from("social_plan")
    .insert({
      team_id: p.teamId,
      day: p.day,
      note: p.note?.trim() || null,
      caption: p.caption?.trim() || null,
      platforms: p.platforms ?? [],
      image_paths: paths,
      event_id: p.eventId ?? null,
    })
    .select(PLAN_COLUMNS)
    .single<PlanItem>();
  if (error) throw error;
  return data;
}

// Signed URLs for a set of image paths (1 hour).
export async function planImageUrls(paths: string[]) {
  if (paths.length === 0) return {} as Record<string, string>;
  const { data } = await createClient()
    .storage.from("social-plan")
    .createSignedUrls(paths, 3600);
  const out: Record<string, string> = {};
  for (const d of data ?? [])
    if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}

// yyyy-mm-dd of an instant in a timezone.
export function dayIn(iso: string | number | Date, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(
    new Date(iso),
  );
}

export function addDays(ymd: string, n: number) {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// "Sat 12 Dec"
export function planDayLabel(ymd: string) {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
