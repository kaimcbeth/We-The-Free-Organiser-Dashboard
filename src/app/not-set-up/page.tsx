import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";

// Shown to someone who has signed in but isn't an organiser yet.
export default async function NotSetUpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: organiser } = await supabase.from("organisers").select("id").eq("id", user.id).maybeSingle();
  if (organiser) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-pink-ink">We The Free</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">You&apos;re signed in</h1>
        <p className="mt-3 text-stone-600">
          <span className="font-medium text-stone-900">{user.email}</span> isn&apos;t set up as an
          organiser yet. Ask your team&apos;s community manager to add you, then sign in again.
        </p>
        <form action={signOut} className="mt-6">
          <button className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
