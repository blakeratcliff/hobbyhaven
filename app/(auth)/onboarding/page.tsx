"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export default function OnboardingPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [breakerName, setBreakerName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Make sure the user is authenticated, and that they haven't already
  // completed onboarding (which would mean they have a profile already).
  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userData.user.id)
        .maybeSingle<{ id: string }>();

      if (profile) {
        // Already onboarded → go to dashboard.
        router.replace("/dashboard");
        return;
      }

      setCheckingAuth(false);
    }
    check();
  }, [router]);

  // Auto-slugify the breaker name unless the user has manually edited the slug.
  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(breakerName));
    }
  }, [breakerName, slugManuallyEdited]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!displayName.trim() || !breakerName.trim() || !slug.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError(
        "Slug can only contain lowercase letters, numbers, and hyphens."
      );
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: rpcError } = await supabase.rpc(
      "create_organization_and_profile",
      {
        org_name: breakerName.trim(),
        org_slug: slug.trim(),
        user_display_name: displayName.trim(),
      }
    );

    if (rpcError) {
      if (rpcError.message.includes("Slug already taken")) {
        setError(
          "That slug is already in use. Try another."
        );
      } else if (rpcError.message.includes("already belongs")) {
        setError("Your account is already set up. Redirecting…");
        setTimeout(() => router.replace("/dashboard"), 1500);
      } else {
        setError(rpcError.message);
      }
      setLoading(false);
      return;
    }

    // Give Supabase a moment to propagate before we redirect.
    // The middleware will run on /dashboard and query the new profile;
    // without this brief delay there's a race where it doesn't see the row yet.
    await new Promise((r) => setTimeout(r, 300));

    // Use a hard navigation to fully refresh the auth/session state.
    window.location.href = "/dashboard";
  }

  if (checkingAuth) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-ink-muted">
          Loading…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set up your Break Room</CardTitle>
        <CardDescription>
          A couple quick details so we can get you started.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <div className="space-y-1.5">
            <Label htmlFor="displayName">Your name</Label>
            <Input
              id="displayName"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jane Smith"
            />
            <p className="text-xs text-ink-subtle">
              Just for your account; not shown publicly.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="breakerName">Breaker name</Label>
            <Input
              id="breakerName"
              type="text"
              required
              value={breakerName}
              onChange={(e) => setBreakerName(e.target.value)}
              placeholder="Acme Sports Cards"
            />
            <p className="text-xs text-ink-subtle">
              The name buyers will see on receipts and listings.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">Subdomain</Label>
            <div className="flex items-center gap-2">
              <Input
                id="slug"
                type="text"
                required
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value.toLowerCase());
                  setSlugManuallyEdited(true);
                }}
                placeholder="acme"
                className="flex-1"
              />
              <span className="text-sm text-ink-muted whitespace-nowrap">
                .hobbyhaven.app
              </span>
            </div>
            <p className="text-xs text-ink-subtle">
              Lowercase letters, numbers, and hyphens only.
            </p>
          </div>

          <Button type="submit" className="w-full" loading={loading}>
            Create my Break Room
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
