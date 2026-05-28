"use client";

import { useState, useTransition, useMemo } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { TeamBadge } from "@/components/breaks/team-badge";
import { addSpotToBreak } from "@/lib/actions/spots";
import { cn } from "@/lib/utils";

type Team = {
  id: string;
  name: string;
  abbreviation: string | null;
  primary_color: string | null;
  text_color: string | null;
};

type Props = {
  breakId: string;
  availableTeams: Team[];
};

export function AddSpotControl({ breakId, availableTeams }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const teamById = useMemo(() => {
    const m = new Map<string, Team>();
    for (const t of availableTeams) m.set(t.id, t);
    return m;
  }, [availableTeams]);

  function toggle(teamId: string) {
    setSelectedIds((curr) =>
      curr.includes(teamId)
        ? curr.filter((id) => id !== teamId)
        : [...curr, teamId]
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await addSpotToBreak(breakId, selectedIds);
      if (!result.ok) {
        setError(result.message || "Failed");
        return;
      }
      // Reset
      setSelectedIds([]);
      setOpen(false);
    });
  }

  function cancel() {
    setSelectedIds([]);
    setError(null);
    setOpen(false);
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Add spot
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-navy-900">
            New spot{selectedIds.length > 0 && ` (${selectedIds.length} teams selected)`}
          </p>
          <button
            type="button"
            onClick={cancel}
            className="text-ink-subtle hover:text-navy-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <p className="text-xs text-ink-muted mb-2">
            Click teams to assign them to this spot. Or leave empty and assign later.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {availableTeams.map((team) => {
              const selected = selectedIds.includes(team.id);
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => toggle(team.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full pl-1 pr-3 py-0.5 text-xs transition-all border",
                    selected
                      ? "border-navy-700 ring-2 ring-navy-200"
                      : "border-cream-200 hover:border-navy-300 bg-white"
                  )}
                >
                  <TeamBadge team={team} variant="abbr" />
                  {team.name}
                </button>
              );
            })}
          </div>
          {availableTeams.length === 0 && (
            <p className="text-xs text-ink-muted italic">
              All teams in this league are already assigned to other spots.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button type="button" size="sm" onClick={save} loading={pending}>
            Add spot
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={cancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
