import { requireCore } from "@/lib/organiser";
import { SocialHubPage } from "@/lib/social-page";

export default async function CoreSocialPage() {
  const { supabase, organiser } = await requireCore();
  return (
    <SocialHubPage
      supabase={supabase}
      teamId={
        organiser.allCommunities || organiser.exampleMode
          ? null
          : organiser.team_id
      }
      back="/attendance/resources"
      canEdit={false}
    />
  );
}
