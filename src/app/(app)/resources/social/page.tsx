import { requireOrganiser } from "@/lib/organiser";
import { SocialHubPage } from "@/lib/social-page";

export default async function SocialPage() {
  const { supabase, organiser } = await requireOrganiser();
  return (
    <SocialHubPage
      supabase={supabase}
      teamId={
        organiser.allCommunities || organiser.exampleMode
          ? null
          : organiser.team_id
      }
      back="/resources"
      canEdit
    />
  );
}
