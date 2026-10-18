import Link from "next/link";
import { requireOrganiser } from "@/lib/organiser";
import { signPhotos } from "@/lib/photos";
import { Avatar } from "@/components/avatar";
import { NavLinks } from "./nav-links";
import { NotificationBell } from "@/components/notification-bell";

const ROLE_LABEL = { admin: "Lead organiser", organiser: "Organiser" } as const;

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { supabase, user, organiser } = await requireOrganiser();

  // The organiser's own member profile (for their photo), if they have one.
  const { data: me } = await supabase
    .from("people")
    .select("id, first_name, last_name, photo_updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const photos = me ? await signPhotos(supabase, [me]) : {};
  const name = me
    ? [me.first_name, me.last_name].filter(Boolean).join(" ")
    : organiser.name;

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 bg-navy text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 pt-3">
          <Link href="/" className="min-w-0 leading-tight">
            <span className="block text-xs font-bold uppercase tracking-wider text-pink">
              We The Free
            </span>
            <span className="block truncate text-sm font-medium text-white">
              {organiser.team?.name ?? "Your team"}
            </span>
          </Link>
          <div className="flex min-w-0 items-center gap-1">
            <NotificationBell supabase={supabase} userId={user.id} />
            <Link
              href="/me"
              className="flex min-w-0 items-center gap-2.5 rounded-full py-1 pl-3 pr-1 hover:bg-white/10"
              aria-label="Your profile"
            >
              <span className="min-w-0 text-right leading-tight">
                <span className="block truncate text-sm font-medium text-white">
                  {name}
                </span>
                <span className="block truncate text-xs text-cyan">
                  {ROLE_LABEL[organiser.role] ?? "Organiser"}
                </span>
              </span>
              <Avatar
                name={name}
                url={me ? photos[me.id] : null}
                size={36}
                className="ring-2 ring-white/20"
              />
            </Link>
          </div>
        </div>
        <NavLinks />
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-5">
        {children}
      </main>
    </div>
  );
}
