import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, organizations(name)")
    .eq("id", user!.id)
    .maybeSingle();

  const orgRecord = profile?.organizations as
    | { name: string }
    | { name: string }[]
    | null
    | undefined;
  const orgName = Array.isArray(orgRecord) ? orgRecord[0]?.name : orgRecord?.name;

  return (
    <div className="container-app py-10">
      <div className="mb-8">
        <h1 className="text-3xl text-navy-900 mb-2">
          Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}.
        </h1>
        <p className="text-ink-muted">
          {orgName} · Your Break Room is ready when you are.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent breaks</CardTitle>
            <CardDescription>No breaks yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-ink-subtle">
              When you create your first break, it&apos;ll show up here.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customers</CardTitle>
            <CardDescription>No customers yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-ink-subtle">
              Add your first customer to start tracking lifetime value.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">This month&apos;s P&amp;L</CardTitle>
            <CardDescription>—</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-ink-subtle">
              Run a break and we&apos;ll do the math for you.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 card-surface p-6">
        <h2 className="text-xl text-navy-900 mb-2">Getting started</h2>
        <p className="text-sm text-ink-muted mb-4">
          Break Room is being built out one feature at a time. Soon you&apos;ll
          be able to:
        </p>
        <ul className="space-y-2 text-sm text-ink-muted list-disc list-inside">
          <li>Create breaks, assign teams to spots, and track break-even live</li>
          <li>Manage your customer list across Whatnot, Fanatics Live, Discord, and more</li>
          <li>Mark spots paid and shipped, with tracking numbers</li>
          <li>See P&amp;L per break and per month</li>
        </ul>
      </div>
    </div>
  );
}
