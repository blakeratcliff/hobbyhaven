"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { deleteCustomer } from "@/lib/actions/customers";
import { cn } from "@/lib/utils";

export function CustomerRowActions({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 5000);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteCustomer(customerId);
      if (!result.ok && result.message) {
        setError(result.message);
        setConfirming(false);
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {error && (
        <span className="text-xs text-red-700 mr-2">{error}</span>
      )}
      <Link
        href={`/customers/${customerId}/edit`}
        aria-label={`Edit ${customerName}`}
        className="inline-flex items-center justify-center h-8 w-8 rounded text-ink-subtle hover:text-navy-900 hover:bg-cream-100 transition-colors"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        aria-label={`Delete ${customerName}`}
        className={cn(
          "inline-flex items-center justify-center h-8 rounded transition-colors disabled:opacity-50",
          confirming
            ? "px-2 text-xs bg-red-600 text-white hover:bg-red-700"
            : "w-8 text-ink-subtle hover:text-red-700 hover:bg-cream-100"
        )}
      >
        {confirming ? "Confirm" : <Trash2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
