import { ROLE_LABEL, type ViewRole } from "@/lib/roles";

const STYLE: Record<ViewRole, string> = {
  god: "bg-navy text-yellow",
  regional_lead: "bg-pink text-navy",
  organiser: "bg-cyan text-navy",
  core_team: "bg-yellow text-navy",
  member: "bg-stone-300/60 text-stone-700",
};

export function RoleChip({ role }: { role: ViewRole }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STYLE[role]}`}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}
