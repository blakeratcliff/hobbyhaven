"use client";

import { useState, useTransition } from "react";
import {
  updateBreakStatus,
  markAllPaid,
  markAllShipped,
} from "@/lib/actions/spots";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";

type Status = "planned" | "in_progress" | "completed" | "canceled";

const STATUSES: { value: Status; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
];

export function BreakStatusChanger({
  breakId,
  currentStatus,
}: {
  breakId: string;
  currentStatus: Status;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as Status;
    if (newStatus === currentStatus) return;

    setError(null);
    startTransition(async () => {
      const result = await updateBreakStatus(breakId, newStatus);
      if (!result.ok) {
        setError(result.message || "Failed");
      }
    });
  }

  return (
    <div className="space-y-1">
      <Select
        value={currentStatus}
        onChange={handleChange}
        disabled={pending}
        className="w-40"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}

export function BulkActionsToolbar({
  breakId,
  hasSoldSpots,
}: {
  breakId: string;
  hasSoldSpots: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleMarkAllPaid() {
    setError(null);
    startTransition(async () => {
      const result = await markAllPaid(breakId);
      if (!result.ok) setError(result.message || "Failed");
    });
  }

  function handleMarkAllShipped() {
    setError(null);
    startTransition(async () => {
      const result = await markAllShipped(breakId);
      if (!result.ok) setError(result.message || "Failed");
    });
  }

  if (!hasSoldSpots) return null;

  return (
    <div className="flex flex-col gap-2">
      {error && <Alert variant="error">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleMarkAllPaid}
          loading={pending}
        >
          Mark all paid
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleMarkAllShipped}
          loading={pending}
        >
          Mark all shipped
        </Button>
      </div>
    </div>
  );
}
