import { ROLE_LABEL, type ViewRole } from "@/lib/roles";

const STYLE: Record<ViewRole, string> = {
  god: "bg-navy text-yellow",
  regional_lead: "bg-pink text-navy",
  organiser: "bg-cyan text-navy",
  core_team: "bg-yellow text-navy",
  member: "bg-stone-300/60 text-stone-700",
  new_member: "bg-stone-300/60 text-stone-700",
  attendee: "bg-white text-stone-500 ring-1 ring-stone-300",
};

// pending: given before they connected their account (starts when they do).
export function RoleChip({
  role,
  pending = false,
  detail,
}: {
  role: ViewRole;
  pending?: boolean;
  detail?: string; // e.g. "Promo Lead" for Core Team
}) {
  return (
    <span
      title={pending ? "Starts when they connect their account" : undefined}
      className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STYLE[role]} ${pending ? "opacity-60 outline-1 outline-dashed outline-offset-1 outline-navy/40" : ""}`}
    >
      {ROLE_LABEL[role]}
      {detail ? ` · ${detail}` : ""}
      {pending ? " · pending" : ""}
    </span>
  );
}
