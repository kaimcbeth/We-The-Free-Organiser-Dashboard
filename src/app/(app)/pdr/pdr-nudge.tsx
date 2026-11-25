import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMeeting, type PdrSummary } from "@/lib/pdr";

// RSLs: a strip at the top of every Hub page while their PDR needs them
// (Kai, 26 Nov 2026). Gone once the draft is marked ready or signed off.
export async function PdrNudge() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pdr_list");
  if (error) return null;
  const open = ((data as PdrSummary[] | null) ?? []).find(
    (p) => p.status === "drafting" || p.status === "meeting",
  );
  if (!open) return null;
  return (
    <Link
      href={`/pdr/${open.id}`}
      className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-yellow/40 px-4 py-2.5 text-sm text-navy ring-1 ring-yellow hover:bg-yellow/60"
    >
      <span>
        <b>
          {open.status === "meeting"
            ? "Your PDR meeting is on."
            : "Your PDR is ready to fill in."}
        </b>{" "}
        {open.status !== "meeting" &&
          (open.meeting_at
            ? `Meeting ${formatMeeting(open.meeting_at, open.timezone)}.`
            : "Fill in your draft before the meeting.")}
      </span>
      <span className="shrink-0 font-semibold">Open →</span>
    </Link>
  );
}
