"use client";

import { useState, useMemo } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  SPORTS,
  LEAGUES_BY_SPORT,
  BREAK_FORMATS,
  type SportKey,
} from "@/lib/constants";
import { createBreak, type ActionResult } from "@/lib/actions/breaks";
import { ProductsFieldArray } from "@/components/breaks/products-field-array";

type Team = {
  id: string;
  sport: string;
  league: string;
  name: string;
  abbreviation: string | null;
  primary_color: string | null;
  text_color: string | null;
};

type Spot = {
  number: number;
  teamIds: string[];
};

export function BreakForm({ teams }: { teams: Team[] }) {
  const [state, formAction] = useFormState<ActionResult, FormData>(createBreak, {
    ok: true,
  });

  // Form state - drives the UI
  const [sport, setSport] = useState<SportKey>("baseball");
  const [league, setLeague] = useState<string>("MLB");
  const [spotsPerBuyer, setSpotsPerBuyer] = useState(1);
  const [spots, setSpots] = useState<Spot[]>([]);

  // Available teams for the selected sport/league
  const availableTeams = useMemo(() => {
    return teams.filter((t) => t.sport === sport && t.league === league);
  }, [teams, sport, league]);

  // Teams assigned to ANY spot - shown as "assigned"
  const assignedTeamIds = useMemo(() => {
    const set = new Set<string>();
    for (const spot of spots) {
      for (const id of spot.teamIds) set.add(id);
    }
    return set;
  }, [spots]);

  // Teams not yet assigned
  const unassignedTeams = useMemo(
    () => availableTeams.filter((t) => !assignedTeamIds.has(t.id)),
    [availableTeams, assignedTeamIds]
  );

  // ============================================================
  // Sport/league change resets the spot configuration
  // ============================================================
  function handleSportChange(newSport: SportKey) {
    setSport(newSport);
    const firstLeague = LEAGUES_BY_SPORT[newSport][0];
    setLeague(firstLeague);
    setSpots([]);
  }

  function handleLeagueChange(newLeague: string) {
    setLeague(newLeague);
    setSpots([]);
  }

  // ============================================================
  // Spot generation
  // ============================================================
  function autoGenerateSpots() {
    if (availableTeams.length === 0) return;

    if (spotsPerBuyer === 1) {
      // One spot per team
      setSpots(
        availableTeams.map((t, idx) => ({
          number: idx + 1,
          teamIds: [t.id],
        }))
      );
    } else {
      // Bucket teams into spots evenly
      const totalSpots = Math.ceil(availableTeams.length / spotsPerBuyer);
      const newSpots: Spot[] = Array.from({ length: totalSpots }, (_, i) => ({
        number: i + 1,
        teamIds: [],
      }));
      availableTeams.forEach((t, idx) => {
        const bucket = idx % totalSpots;
        newSpots[bucket].teamIds.push(t.id);
      });
      setSpots(newSpots);
    }
  }

  function addEmptySpot() {
    setSpots([...spots, { number: spots.length + 1, teamIds: [] }]);
  }

  function removeSpot(number: number) {
    const filtered = spots.filter((s) => s.number !== number);
    // Renumber remaining spots
    setSpots(filtered.map((s, idx) => ({ ...s, number: idx + 1 })));
  }

  function assignTeamToSpot(teamId: string, spotNumber: number) {
    setSpots(
      spots.map((s) =>
        s.number === spotNumber
          ? { ...s, teamIds: [...s.teamIds, teamId] }
          : s
      )
    );
  }

  function removeTeamFromSpot(teamId: string, spotNumber: number) {
    setSpots(
      spots.map((s) =>
        s.number === spotNumber
          ? { ...s, teamIds: s.teamIds.filter((id) => id !== teamId) }
          : s
      )
    );
  }

  const teamById = useMemo(() => {
    const map = new Map<string, Team>();
    for (const t of teams) map.set(t.id, t);
    return map;
  }, [teams]);

  const availableLeagues = LEAGUES_BY_SPORT[sport];

  return (
    <form action={formAction} className="space-y-8">
      {state.message && !state.ok && (
        <Alert variant="error">{state.message}</Alert>
      )}

      {/* ============================================================
          Section 1: Products
          ============================================================ */}
      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-xl text-navy-900">Products</h2>
          <p className="text-sm text-ink-muted">
            What are you breaking? Add multiple products for a mixer.
          </p>
        </div>

        <ProductsFieldArray />
        {state.fieldErrors?.products && (
          <Alert variant="error">{state.fieldErrors.products[0]}</Alert>
        )}
      </section>

      <div className="gold-divider" />

      {/* ============================================================
          Section 2: Sport / League
          ============================================================ */}
      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-xl text-navy-900">Sport &amp; league</h2>
          <p className="text-sm text-ink-muted">
            All products in this break share the same teams.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="sport">Sport</Label>
            <Select
              id="sport"
              name="sport"
              value={sport}
              onChange={(e) => handleSportChange(e.target.value as SportKey)}
            >
              {SPORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="league">League</Label>
            <Select
              id="league"
              name="league"
              value={league}
              onChange={(e) => handleLeagueChange(e.target.value)}
              disabled={availableLeagues.length === 1}
            >
              {availableLeagues.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <div className="gold-divider" />

      {/* ============================================================
          Section 3: Format
          ============================================================ */}
      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-xl text-navy-900">Format</h2>
          <p className="text-sm text-ink-muted">
            How are you running this break?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BREAK_FORMATS.map((f) => (
            <label
              key={f.value}
              className="cursor-pointer block"
            >
              <input
                type="radio"
                name="format"
                value={f.value}
                defaultChecked={f.value === "random_team"}
                className="peer sr-only"
              />
              <div className="border-2 border-cream-200 rounded-lg p-4 peer-checked:border-navy-700 peer-checked:bg-cream-100 transition-colors">
                <p className="font-medium text-navy-900">{f.label}</p>
                <p className="text-sm text-ink-muted mt-1">{f.description}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="space-y-1.5 max-w-xs">
          <Label htmlFor="spots_per_buyer">Teams per spot</Label>
          <Input
            id="spots_per_buyer"
            name="spots_per_buyer"
            type="number"
            min="1"
            max="50"
            value={spotsPerBuyer}
            onChange={(e) => setSpotsPerBuyer(parseInt(e.target.value) || 1)}
          />
          <p className="text-xs text-ink-subtle">
            How many teams does each buyer get?
          </p>
        </div>
      </section>

      <div className="gold-divider" />

      {/* ============================================================
          Section 4: Teams / Spots
          ============================================================ */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-serif text-xl text-navy-900">Spots</h2>
            <p className="text-sm text-ink-muted">
              {spotsPerBuyer === 1
                ? `${availableTeams.length} ${league} teams available. Auto-generate one spot per team, or build manually.`
                : `${availableTeams.length} ${league} teams available. Auto-generate spots or add them manually.`}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={autoGenerateSpots}
            >
              Auto-generate spots
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addEmptySpot}
            >
              <Plus className="h-4 w-4" />
              Add empty spot
            </Button>
            {spots.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSpots([])}
              >
                Clear all
              </Button>
            )}
          </div>
        </div>

        {state.fieldErrors?.team_ids && (
          <Alert variant="error">
            {state.fieldErrors.team_ids[0]}
          </Alert>
        )}

        <input type="hidden" name="spot_count" value={spots.length} />

        {spots.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-ink-muted mb-3">
                No spots yet. Click <strong>Auto-generate spots</strong> to
                fill them in based on the teams in {league}.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {spots.map((spot) => (
              <Card key={spot.number}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-navy-900 text-cream-50 text-xs font-medium">
                        {spot.number}
                      </span>
                      <span className="text-sm font-medium text-navy-900">
                        Spot {spot.number}
                      </span>
                      <span className="text-xs text-ink-subtle">
                        {spot.teamIds.length} {spot.teamIds.length === 1 ? "team" : "teams"}
                      </span>
                    </div>
                    {spots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSpot(spot.number)}
                        className="text-ink-subtle hover:text-red-600 transition-colors"
                        aria-label="Remove spot"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {spot.teamIds.length === 0 && (
                      <span className="text-sm text-ink-subtle italic">
                        No teams assigned yet
                      </span>
                    )}
                    {spot.teamIds.map((teamId, idx) => {
                      const team = teamById.get(teamId);
                      if (!team) return null;
                      const bg = team.primary_color || "#1a2540";
                      const fg = team.text_color || "#FFFFFF";
                      return (
                        <span
                          key={teamId}
                          className="inline-flex items-center gap-1.5 rounded-full pl-1 pr-1 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: bg, color: fg }}
                        >
                          <span
                            className="inline-flex items-center justify-center h-5 min-w-[2rem] px-1.5 rounded-full text-[10px] font-bold bg-black/20"
                          >
                            {team.abbreviation || team.name.slice(0, 3).toUpperCase()}
                          </span>
                          <span className="pr-1">{team.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              removeTeamFromSpot(teamId, spot.number)
                            }
                            className="h-4 w-4 rounded-full flex items-center justify-center hover:bg-black/20 transition-colors"
                            aria-label={`Remove ${team.name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <input
                            type="hidden"
                            name={`spot_${spot.number}_team_${idx}`}
                            value={teamId}
                          />
                        </span>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Unassigned teams - click to add to last spot */}
        {unassignedTeams.length > 0 && spots.length > 0 && (
          <div>
            <p className="text-sm text-ink-muted mb-2">
              Click a team to add it to a spot:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {unassignedTeams.map((team) => (
                <TeamChip
                  key={team.id}
                  team={team}
                  spots={spots}
                  onAssign={(spotNum) => assignTeamToSpot(team.id, spotNum)}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="gold-divider" />

      {/* ============================================================
          Section 5: Notes
          ============================================================ */}
      <section className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="break_date">Break date</Label>
            <Input
              id="break_date"
              name="break_date"
              type="datetime-local"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Anything to remember about this break..."
          />
        </div>
      </section>

      <div className="flex items-center gap-3 pt-4">
        <SubmitButton />
        <Link href="/breaks">
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}

// ============================================================
// Inner: TeamChip with assign-to-spot picker
// ============================================================
function TeamChip({
  team,
  spots,
  onAssign,
}: {
  team: Team;
  spots: Spot[];
  onAssign: (spotNumber: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const bg = team.primary_color || "#1a2540";
  const fg = team.text_color || "#FFFFFF";
  const abbr = team.abbreviation || team.name.slice(0, 3).toUpperCase();

  const baseChipClass =
    "inline-flex items-center gap-1.5 bg-white border rounded-full pl-1 pr-3 py-0.5 text-xs transition-colors";
  const abbrBadgeClass =
    "inline-flex items-center justify-center h-5 min-w-[2rem] px-1.5 rounded-full text-[10px] font-bold";

  // If only one spot, just assign directly on click
  if (spots.length === 1) {
    return (
      <button
        type="button"
        onClick={() => onAssign(spots[0].number)}
        className={cn(
          baseChipClass,
          "border-cream-200 hover:border-navy-300 hover:bg-cream-50"
        )}
      >
        <span
          className={abbrBadgeClass}
          style={{ backgroundColor: bg, color: fg }}
        >
          {abbr}
        </span>
        {team.name}
        <Plus className="h-3 w-3 text-ink-subtle" />
      </button>
    );
  }

  // Otherwise show a dropdown of spots
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          baseChipClass,
          open
            ? "border-navy-700"
            : "border-cream-200 hover:border-navy-300 hover:bg-cream-50"
        )}
      >
        <span
          className={abbrBadgeClass}
          style={{ backgroundColor: bg, color: fg }}
        >
          {abbr}
        </span>
        {team.name}
        <Plus className="h-3 w-3 text-ink-subtle" />
      </button>
      {open && (
        <div className="absolute z-10 mt-1 left-0 bg-white border border-cream-200 rounded-md shadow-card-hover py-1 min-w-[140px]">
          {spots.map((spot) => (
            <button
              key={spot.number}
              type="button"
              onClick={() => {
                onAssign(spot.number);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-cream-100 flex items-center gap-2"
            >
              <Check className="h-3 w-3 opacity-0" />
              Spot {spot.number}
              <span className="text-ink-subtle">
                ({spot.teamIds.length})
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Create break
    </Button>
  );
}
