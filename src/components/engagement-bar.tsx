import { engagementColour, type Engagement } from "@/lib/engagement";

// Ten little segments, filled up to the score, coloured red (0) to bright
// green (10), with an arrow if it's moved a lot in the last two months.
export function EngagementBar({
  e,
  size = "sm",
}: {
  e: Engagement;
  size?: "sm" | "md";
}) {
  const colour = engagementColour(e.score);
  const seg = size === "md" ? "h-2.5 w-3.5" : "h-1.5 w-1.5";
  return (
    <span
      className="inline-flex items-center gap-1"
      title={`Engagement ${e.score}/10${e.was !== null ? ` (was ${e.was} two months ago)` : ""}`}
      aria-label={`Engagement ${e.score} out of 10${e.trend ? `, going ${e.trend}` : ""}`}
    >
      <span className="inline-flex gap-px">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={`${seg} rounded-[2px]`}
            style={{ background: i < e.score ? colour : "rgb(0 0 0 / 0.08)" }}
          />
        ))}
      </span>
      {e.trend && (
        <span
          aria-hidden
          className={`text-xs font-bold ${e.trend === "up" ? "text-[hsl(130_70%_35%)]" : "text-[hsl(10_80%_45%)]"}`}
        >
          {e.trend === "up" ? "↑" : "↓"}
        </span>
      )}
    </span>
  );
}
