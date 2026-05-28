"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { slugify } from "@/lib/utils";
import {
  updateOrganization,
  updateProfile,
  type ActionResult,
} from "@/lib/actions/settings";

// ============================================================
// ORG FORM
// ============================================================
export function OrgSettingsForm({
  initialName,
  initialSlug,
}: {
  initialName: string;
  initialSlug: string;
}) {
  const [state, formAction] = useFormState<ActionResult, FormData>(
    updateOrganization,
    { ok: true }
  );

  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(true);
  // Note: starting in "manually edited" state so we don't accidentally
  // overwrite an established slug as the user types in name.

  return (
    <form action={formAction} className="space-y-4">
      {state.message && state.ok && (
        <Alert variant="success">{state.message}</Alert>
      )}
      {state.message && !state.ok && (
        <Alert variant="error">{state.message}</Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">Breaker name</Label>
        <Input
          id="name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {state.fieldErrors?.name && (
          <p className="text-xs text-red-700">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slug">Subdomain</Label>
        <div className="flex items-center gap-2">
          <Input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value.toLowerCase());
              setSlugManuallyEdited(true);
            }}
            className="flex-1"
          />
          <span className="text-sm text-ink-muted whitespace-nowrap">
            .hobbyhaven.app
          </span>
        </div>
        <p className="text-xs text-ink-subtle">
          Lowercase letters, numbers, and hyphens only.
        </p>
        {state.fieldErrors?.slug && (
          <p className="text-xs text-red-700">{state.fieldErrors.slug[0]}</p>
        )}
      </div>

      <OrgSubmitButton />
    </form>
  );
}

function OrgSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Save org
    </Button>
  );
}

// ============================================================
// PROFILE FORM
// ============================================================
export function ProfileSettingsForm({
  initialDisplayName,
  email,
}: {
  initialDisplayName: string;
  email: string | null;
}) {
  const [state, formAction] = useFormState<ActionResult, FormData>(
    updateProfile,
    { ok: true }
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.message && state.ok && (
        <Alert variant="success">{state.message}</Alert>
      )}
      {state.message && !state.ok && (
        <Alert variant="error">{state.message}</Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="display_name">Your name</Label>
        <Input
          id="display_name"
          name="display_name"
          required
          defaultValue={initialDisplayName}
        />
        {state.fieldErrors?.display_name && (
          <p className="text-xs text-red-700">
            {state.fieldErrors.display_name[0]}
          </p>
        )}
      </div>

      {email && (
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={email} disabled />
          <p className="text-xs text-ink-subtle">
            Email changes aren&apos;t supported yet.
          </p>
        </div>
      )}

      <ProfileSubmitButton />
    </form>
  );
}

function ProfileSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Save profile
    </Button>
  );
}
