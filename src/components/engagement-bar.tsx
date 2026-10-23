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
      className="group/eng relative inline-flex items-center gap-1"
      aria-label={`Engagement ${e.score} out of 10${e.trend ? `, going ${e.trend}` : ""}`}
      tabIndex={0}
    >
      {/* Small explainer on hover (or focus). */}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 w-56 rounded-xl bg-navy px-3 py-2 text-left text-xs font-normal leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover/eng:opacity-100 group-focus/eng:opacity-100"
      >
        <span className="block font-semibold">
          Engagement {e.score}/10
          {e.trend === "up" ? " ↑" : e.trend === "down" ? " ↓" : ""}
        </span>
        How many of the community&apos;s events they&apos;ve come to over the
        last 3 months, with recent weeks counting most.
        {e.was !== null && (
          <span className="mt-1 block text-white/70">
            Two months ago: {e.was}/10
          </span>
        )}
      </span>
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
