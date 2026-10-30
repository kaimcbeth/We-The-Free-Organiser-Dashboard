import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VIEW_AS_COOKIE } from "@/lib/organiser";
import { OpenFeedback } from "../open-feedback";

// Feedback tab: anything, any time, straight to the community's organisers.
export default async function MemberFeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: organiser } = await supabase
    .from("organisers")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  // God Mode previewing as a member: nothing is sent.
  const viewAs = (await cookies()).get(VIEW_AS_COOKIE)?.value ?? "";
  const preview = ["member", "new_member"].includes(viewAs) && !!organiser;
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Feedback</h1>
      <p className="mt-1 text-stone-600">
        Tell your organisers anything, any time. Add your name or send it
        anonymously.
      </p>
      <div className="mt-6">
        <OpenFeedback preview={preview} />
      </div>
    </>
  );
}
