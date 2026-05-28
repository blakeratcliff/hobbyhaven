import { cn } from "@/lib/utils";

type Team = {
  name: string;
  abbreviation: string | null;
  primary_color?: string | null;
  text_color?: string | null;
};

type Variant = "full" | "abbr";

/**
 * A colored chip showing a team. Two variants:
 * - "full" (default): "Boston Red Sox" rendered as a pill in team colors
 * - "abbr": "BOS" in a small square, useful in tight spaces
 */
export function TeamBadge({
  team,
  variant = "full",
  className,
}: {
  team: Team;
  variant?: Variant;
  className?: string;
}) {
  const bg = team.primary_color || "#1a2540";
  const fg = team.text_color || "#FFFFFF";

  if (variant === "abbr") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center h-6 min-w-[2rem] px-1.5 rounded text-xs font-bold tabular-nums",
          className
        )}
        style={{ backgroundColor: bg, color: fg }}
        title={team.name}
      >
        {team.abbreviation || team.name.slice(0, 3).toUpperCase()}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full pl-1 pr-3 py-0.5 text-xs font-medium",
        className
      )}
      style={{ backgroundColor: bg, color: fg }}
    >
      <span
        className="inline-flex items-center justify-center h-5 min-w-[2rem] px-1.5 rounded-full text-[10px] font-bold bg-black/20"
      >
        {team.abbreviation || team.name.slice(0, 3).toUpperCase()}
      </span>
      {team.name}
    </span>
  );
}
