"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { BREAK_FORMATS } from "@/lib/constants";
import { updateBreak, type ActionResult } from "@/lib/actions/breaks";

type Props = {
  breakId: string;
  initialData: {
    product_name: string;
    product_year: number | null;
    format: "random_team" | "pyt";
    box_cost: number | null;
    box_count: number;
    break_date: string | null;
    notes: string | null;
  };
};

export function BreakEditForm({ breakId, initialData }: Props) {
  const action = updateBreak.bind(null, breakId);
  const [state, formAction] = useFormState<ActionResult, FormData>(action, {
    ok: true,
  });

  // Convert ISO datetime to the local-datetime format the input wants.
  // datetime-local input expects "YYYY-MM-DDTHH:mm".
  const breakDateValue = initialData.break_date
    ? new Date(initialData.break_date).toISOString().slice(0, 16)
    : "";

  return (
    <form action={formAction} className="space-y-6">
      {state.message && !state.ok && (
        <Alert variant="error">{state.message}</Alert>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-xl text-navy-900">Product</h2>
          <p className="text-sm text-ink-muted">
            Sport and league can&apos;t be changed after a break is created.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="product_name">Product name</Label>
            <Input
              id="product_name"
              name="product_name"
              required
              defaultValue={initialData.product_name}
            />
            {state.fieldErrors?.product_name && (
              <p className="text-xs text-red-700">
                {state.fieldErrors.product_name[0]}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product_year">Year</Label>
            <Input
              id="product_year"
              name="product_year"
              type="number"
              defaultValue={initialData.product_year || ""}
              min="1980"
              max="2100"
            />
          </div>
        </div>
      </section>

      <div className="gold-divider" />

      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-xl text-navy-900">Cost</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="box_cost">Box cost</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-sm">
                $
              </span>
              <Input
                id="box_cost"
                name="box_cost"
                type="number"
                step="0.01"
                min="0"
                defaultValue={initialData.box_cost || ""}
                className="pl-7"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="box_count">Number of boxes</Label>
            <Input
              id="box_count"
              name="box_count"
              type="number"
              min="1"
              defaultValue={initialData.box_count}
            />
          </div>
        </div>
      </section>

      <div className="gold-divider" />

      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-xl text-navy-900">Format</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BREAK_FORMATS.map((f) => (
            <label key={f.value} className="cursor-pointer block">
              <input
                type="radio"
                name="format"
                value={f.value}
                defaultChecked={f.value === initialData.format}
                className="peer sr-only"
              />
              <div className="border-2 border-cream-200 rounded-lg p-4 peer-checked:border-navy-700 peer-checked:bg-cream-100 transition-colors">
                <p className="font-medium text-navy-900">{f.label}</p>
                <p className="text-sm text-ink-muted mt-1">{f.description}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      <div className="gold-divider" />

      <section className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="break_date">Break date</Label>
            <Input
              id="break_date"
              name="break_date"
              type="datetime-local"
              defaultValue={breakDateValue}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={initialData.notes || ""}
          />
        </div>
      </section>

      <div className="flex items-center gap-3 pt-4">
        <SubmitButton />
        <Link href={`/breaks/${breakId}`}>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Save changes
    </Button>
  );
}
