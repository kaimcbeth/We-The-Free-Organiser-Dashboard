import { cookies } from "next/headers";
import { VIEW_AS_COOKIE } from "@/lib/organiser";
import { ROLE_LABEL, type ViewRole } from "@/lib/roles";
import { setViewAs } from "@/app/actions";

// Shown on member pages while God Mode is previewing as a member.
export async function PreviewBanner() {
  const as = (await cookies()).get(VIEW_AS_COOKIE)?.value as
    ViewRole | undefined;
  if (as !== "member" && as !== "new_member") return null;
  return (
    <form
      action={async () => {
        "use server";
        await setViewAs(null);
      }}
      className="mb-6 flex items-center justify-between gap-3 rounded-2xl bg-yellow px-4 py-3 text-sm text-navy"
    >
      <span>
        Previewing as <span className="font-semibold">{ROLE_LABEL[as]}</span>
      </span>
      <button className="rounded-lg bg-navy px-3 py-1.5 font-semibold text-white">
        Exit preview
      </button>
    </form>
  );
}
