import Link from "next/link";
import { requireOrganiser } from "@/lib/organiser";
import { signOut } from "@/app/actions";
import { NavLinks } from "./nav-links";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { organiser } = await requireOrganiser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 pt-3">
          <Link href="/" className="leading-tight">
            <span className="block text-xs font-semibold uppercase tracking-wide text-brand">
              We The Free
            </span>
            <span className="block text-sm font-medium text-stone-700">
              {organiser.team?.name ?? "Your team"}
            </span>
          </Link>
          <form action={signOut}>
            <button className="rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-black/5">
              Sign out
            </button>
          </form>
        </div>
        <NavLinks />
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-5">{children}</main>
    </div>
  );
}
