import type { OrgGoal } from "@/lib/pdr";

// The year's organisational goals, with live progress where the Hub has the
// numbers (Kai, 26 Nov 2026).
export function GoalBars({ goals }: { goals: OrgGoal[] }) {
  return (
    <ul className="mt-2 space-y-2.5">
      {goals.map((g, i) => {
        const pct =
          g.progress != null && g.target
            ? Math.min(100, Math.round((g.progress / g.target) * 100))
            : null;
        return (
          <li key={i}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium text-navy">
                {g.target != null ? `${g.target.toLocaleString("en-AU")} ` : ""}
                {g.label}
              </span>
              {g.progress != null && (
                <span className="text-xs text-stone-500">
                  {g.progress.toLocaleString("en-AU")} so far
                  {pct != null && ` · ${pct}%`}
                </span>
              )}
            </div>
            {pct != null && (
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-cyan"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
