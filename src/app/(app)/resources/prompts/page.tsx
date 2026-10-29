import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrganiser } from "@/lib/organiser";
import { DiscussionPrompts } from "./discussion-prompts";

export default async function PromptsPage() {
  const { supabase, organiser } = await requireOrganiser();
  if (organiser.role === "core_team") redirect("/resources");
  const teamId =
    organiser.allCommunities || organiser.exampleMode
      ? null
      : organiser.team_id;
  const { data: posted } = teamId
    ? await supabase
        .from("discussion_prompt_posts")
        .select("prompt_id, posted_at")
        .eq("team_id", teamId)
    : { data: [] };
  return (
    <>
      <Link
        href="/resources"
        className="text-sm font-medium text-stone-500 hover:text-stone-800 hover:underline"
      >
        ← Resources &amp; Training
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Group chat discussion prompts
      </h1>
      <p className="mt-1 text-stone-600">
        Questions to post in your community chat between events. Copy one, post
        it, and mark it posted so you don&apos;t repeat it.
      </p>
      <div className="mt-5">
        <DiscussionPrompts
          teamId={teamId}
          posted={Object.fromEntries(
            (posted ?? []).map((p) => [p.prompt_id, p.posted_at as string]),
          )}
        />
      </div>
    </>
  );
}
