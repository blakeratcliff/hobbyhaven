"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteCustomer } from "@/lib/actions/customers";
import { Button } from "@/components/ui/button";

export function DeleteCustomerButton({ customerId }: { customerId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      // Auto-cancel confirmation after 5s
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
      // On success the server action redirects.
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={confirming ? "danger" : "secondary"}
        size="sm"
        onClick={handleClick}
        loading={pending}
      >
        <Trash2 className="h-4 w-4" />
        {confirming ? "Click again to confirm" : "Delete"}
      </Button>
      {error && (
        <p className="text-xs text-red-700">{error}</p>
      )}
    </div>
  );
}
