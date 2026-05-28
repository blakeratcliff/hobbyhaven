"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import type { ActionResult } from "@/lib/actions/customers";

type Username = {
  platform: string;
  username: string;
};

type Props = {
  action: (state: ActionResult, formData: FormData) => Promise<ActionResult>;
  initialData?: {
    display_name: string;
    notes: string | null;
    usernames: Username[];
  };
  submitLabel: string;
  cancelHref: string;
};

const PLATFORMS: { value: string; label: string }[] = [
  { value: "whatnot", label: "Whatnot" },
  { value: "fanatics_live", label: "Fanatics Live" },
  { value: "discord", label: "Discord" },
  { value: "ebay", label: "eBay" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "Twitter / X" },
  { value: "other", label: "Other" },
];

export function CustomerForm({
  action,
  initialData,
  submitLabel,
  cancelHref,
}: Props) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    action,
    { ok: true }
  );

  const [usernames, setUsernames] = useState<Username[]>(
    initialData?.usernames && initialData.usernames.length > 0
      ? initialData.usernames
      : [{ platform: "whatnot", username: "" }]
  );

  function addUsername() {
    setUsernames([...usernames, { platform: "whatnot", username: "" }]);
  }

  function removeUsername(idx: number) {
    setUsernames(usernames.filter((_, i) => i !== idx));
  }

  function updateUsername(idx: number, field: "platform" | "username", value: string) {
    const next = [...usernames];
    next[idx] = { ...next[idx], [field]: value };
    setUsernames(next);
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.message && !state.ok && (
        <Alert variant="error">{state.message}</Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="display_name">Name</Label>
        <Input
          id="display_name"
          name="display_name"
          required
          defaultValue={initialData?.display_name || ""}
          placeholder="John Smith"
        />
        {state.fieldErrors?.display_name && (
          <p className="text-xs text-red-700">
            {state.fieldErrors.display_name[0]}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Usernames</Label>
        <p className="text-xs text-ink-subtle mb-2">
          The first one listed is the primary. Add as many as you need.
        </p>
        <div className="space-y-2">
          {usernames.map((u, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Select
                name={`username_platform_${idx}`}
                value={u.platform}
                onChange={(e) => updateUsername(idx, "platform", e.target.value)}
                className="w-44"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
              <Input
                name={`username_value_${idx}`}
                value={u.username}
                onChange={(e) => updateUsername(idx, "username", e.target.value)}
                placeholder="username"
                className="flex-1"
              />
              {usernames.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeUsername(idx)}
                  aria-label="Remove username"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addUsername}
          className="mt-2"
        >
          <Plus className="h-4 w-4" />
          Add another
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={initialData?.notes || ""}
          placeholder="Anything you want to remember about this customer..."
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
        <Link href={cancelHref}>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}
