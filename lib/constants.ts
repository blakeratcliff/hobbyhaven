/**
 * Sport / league constants used in break creation.
 * Source of truth is the seeded `teams` table, but these are useful
 * for UI dropdowns where we want labels and known options.
 */

export type SportKey = "baseball" | "basketball" | "football" | "hockey" | "soccer";

export const SPORTS: { value: SportKey; label: string }[] = [
  { value: "baseball", label: "Baseball" },
  { value: "basketball", label: "Basketball" },
  { value: "football", label: "Football" },
  { value: "hockey", label: "Hockey" },
  { value: "soccer", label: "Soccer" },
];

export const SPORT_LABELS: Record<SportKey, string> = {
  baseball: "Baseball",
  basketball: "Basketball",
  football: "Football",
  hockey: "Hockey",
  soccer: "Soccer",
};

/**
 * For single-league sports, only one league is selectable.
 * Soccer is multi-league, so the user picks from a dropdown.
 */
export const LEAGUES_BY_SPORT: Record<SportKey, string[]> = {
  baseball: ["MLB"],
  basketball: ["NBA"],
  football: ["NFL"],
  hockey: ["NHL"],
  soccer: ["MLS", "EPL", "La Liga", "Bundesliga", "Serie A", "Ligue 1"],
};

/**
 * Break format options.
 */
export const BREAK_FORMATS: { value: "random_team" | "pyt"; label: string; description: string }[] =
  [
    {
      value: "random_team",
      label: "Random Team",
      description: "Teams are randomly assigned to spots after they're sold.",
    },
    {
      value: "pyt",
      label: "Pick Your Team",
      description: "Buyers choose which team(s) they want before purchasing.",
    },
  ];
