import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Pull the org for the header. If they don't have a profile yet, send to onboarding.
  // Retry once on null because there can be a brief window right after signup
  // where the auth context hasn't fully propagated to the RLS evaluator.
  let profile: { display_name: string | null; org_id: string } | null = null;
  for (let i = 0; i < 2; i++) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, org_id")
      .eq("id", user.id)
      .maybeSingle<{ display_name: string | null; org_id: string }>();
    if (data) {
      profile = data;
      break;
    }
    if (i === 0) await new Promise((r) => setTimeout(r, 200));
  }

  if (!profile) {
    redirect("/onboarding");
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name, slug")
    .eq("id", profile.org_id)
    .maybeSingle<{ name: string; slug: string }>();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-cream-200 bg-white">
        <div className="container-app py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-navy-900 flex items-center justify-center">
                <span className="font-serif text-cream-50 text-lg leading-none">
                  H
                </span>
              </div>
              <span className="font-serif text-xl text-navy-900">
                Hobby Haven
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link
                href="/dashboard"
                className="text-ink-muted hover:text-navy-900 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/breaks"
                className="text-ink-muted hover:text-navy-900 transition-colors"
              >
                Breaks
              </Link>
              <Link
                href="/customers"
                className="text-ink-muted hover:text-navy-900 transition-colors"
              >
                Customers
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-ink-muted">
              {org?.name}
            </span>
            <Link
              href="/settings"
              className="text-sm text-ink-muted hover:text-navy-900 transition-colors"
            >
              Settings
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
