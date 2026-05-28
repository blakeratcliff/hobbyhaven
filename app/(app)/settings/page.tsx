import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { OrgSettingsForm, ProfileSettingsForm } from "@/components/settings/settings-forms";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email, org_id")
    .eq("id", user.id)
    .maybeSingle<{ display_name: string | null; email: string | null; org_id: string }>();

  if (!profile) {
    redirect("/onboarding");
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name, slug")
    .eq("id", profile.org_id)
    .maybeSingle<{ name: string; slug: string }>();

  return (
    <div className="container-app py-10 max-w-2xl">
      <h1 className="text-3xl text-navy-900 mb-1">Settings</h1>
      <p className="text-ink-muted mb-8">
        Manage your account and your Break Room.
      </p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Break Room</CardTitle>
            <CardDescription>
              How your business appears and where buyers find it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OrgSettingsForm
              initialName={org?.name || ""}
              initialSlug={org?.slug || ""}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your profile</CardTitle>
            <CardDescription>
              How you appear inside the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileSettingsForm
              initialDisplayName={profile.display_name || ""}
              email={profile.email}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
