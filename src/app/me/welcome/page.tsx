import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WelcomeFlow } from "@/components/welcome-flow";

// Welcome to We The Free: mission and values for new members.
export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <>
      <WelcomeFlow doneHref="/me#coming-up" track />
    </>
  );
}
