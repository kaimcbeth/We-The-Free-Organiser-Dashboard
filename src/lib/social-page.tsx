import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SocialHub } from "@/components/social-hub";

// The Social Media Hub page, shared by organisers and the Core Team.
export async function SocialHubPage({
  supabase,
  teamId,
  back,
  canEdit,
}: {
  supabase: SupabaseClient;
  teamId: string | null;
  back: string;
  canEdit: boolean;
}) {
  const { data: team } = teamId
    ? await supabase
        .from("teams")
        .select("name, instagram_handle")
        .eq("id", teamId)
        .maybeSingle<{ name: string; instagram_handle: string | null }>()
    : { data: null };
  return (
    <>
      <Link
        href={back}
        className="text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline"
      >
        ← Resources &amp; Training
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Social Media Hub
      </h1>
      <p className="mt-1 text-stone-600">
        Posts from the We The Free main page, ready to post on your own
        Instagram with your username on them. Share the slides, paste the
        caption, done.
      </p>
      <div className="mt-5">
        <SocialHub
          teamId={teamId}
          community={(team?.name ?? "").split(",")[0].trim()}
          handle={team?.instagram_handle ?? null}
          canEditHandle={canEdit && !!teamId}
        />
      </div>
    </>
  );
}
