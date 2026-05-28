import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { SPORT_LABELS, type SportKey } from "@/lib/constants";

type RecentBreak = {
  id: string;
  product_name: string;
  product_year: number | null;
  sport: SportKey;
  league: string | null;
  status: "planned" | "in_progress" | "completed" | "canceled";
  break_date: string | null;
  created_at: string;
};

type PnlRow = {
  break_id: string;
  total_revenue: number;
  net_profit: number;
};

const STATUS_LABELS: Record<RecentBreak["status"], string> = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  canceled: "Canceled",
};

const STATUS_CLASSES: Record<RecentBreak["status"], string> = {
  planned: "bg-cream-100 text-ink-muted",
  in_progress: "bg-navy-100 text-navy-900",
  completed: "bg-green-50 text-green-900",
  canceled: "bg-red-50 text-red-700",
};

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, org_id")
    .eq("id", user!.id)
    .maybeSingle<{ display_name: string | null; org_id: string }>();

  let orgName: string | undefined;
  if (profile) {
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", profile.org_id)
      .maybeSingle<{ name: string }>();
    orgName = org?.name;
  }

  // Recent breaks (top 5, most recent first)
  const { data: recentBreaks } = await supabase
    .from("breaks")
    .select(
      "id, product_name, product_year, sport, league, status, break_date, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(5);
  const breaks = (recentBreaks as RecentBreak[] | null) || [];

  // Product counts per break (for "and N more")
  const recentBreakIds = breaks.map((b) => b.id);
  const productCountMap: Record<string, number> = {};
  if (recentBreakIds.length > 0) {
    const { data: prods } = await supabase
      .from("break_products")
      .select("break_id")
      .in("break_id", recentBreakIds);
    for (const row of (prods as { break_id: string }[] | null) || []) {
      productCountMap[row.break_id] = (productCountMap[row.break_id] || 0) + 1;
    }
  }

  // Customer count
  const { count: customerCount } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });

  // This month's P&L
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data: monthBreaks } = await supabase
    .from("breaks")
    .select("id")
    .gte("created_at", monthStart);
  const monthBreakIds = ((monthBreaks as { id: string }[] | null) || []).map(
    (b) => b.id
  );

  let monthRevenue = 0;
  let monthNetProfit = 0;
  if (monthBreakIds.length > 0) {
    const { data: pnl } = await supabase
      .from("break_pnl")
      .select("break_id, total_revenue, net_profit")
      .in("break_id", monthBreakIds);
    for (const p of (pnl as PnlRow[] | null) || []) {
      monthRevenue += p.total_revenue || 0;
      monthNetProfit += p.net_profit || 0;
    }
  }

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {/* Recent breaks card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent breaks</CardTitle>
            <CardDescription>
              {breaks.length === 0
                ? "No breaks yet."
                : `${breaks.length} most recent`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {breaks.length === 0 ? (
              <p className="text-sm text-ink-subtle mb-3">
                Plan your first break to start tracking spots and profit.
              </p>
            ) : (
              <ul className="space-y-2 mb-3">
                {breaks.slice(0, 3).map((b) => (
                  <li key={b.id} className="text-sm">
                    <Link
                      href={`/breaks/${b.id}`}
                      className="flex items-start justify-between gap-2 hover:bg-cream-50 -mx-2 px-2 py-1 rounded transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-navy-900 font-medium truncate">
                          {b.product_year ? `${b.product_year} ` : ""}
                          {b.product_name}
                          {(productCountMap[b.id] || 1) > 1 && (
                            <span className="text-ink-subtle font-normal">
                              {" "}and {(productCountMap[b.id] || 1) - 1} more
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-ink-subtle">
                          {SPORT_LABELS[b.sport]}
                          {b.league ? ` · ${b.league}` : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0",
                          STATUS_CLASSES[b.status]
                        )}
                      >
                        {STATUS_LABELS[b.status]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/breaks"
              className="text-xs text-navy-700 hover:underline"
            >
              View all breaks →
            </Link>
          </CardContent>
        </Card>

        {/* Customers card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customers</CardTitle>
            <CardDescription>
              {customerCount === 0
                ? "No customers yet."
                : `${customerCount} ${customerCount === 1 ? "customer" : "customers"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(customerCount || 0) === 0 ? (
              <p className="text-sm text-ink-subtle mb-3">
                Add your first customer to start tracking lifetime value.
              </p>
            ) : (
              <p className="text-sm text-ink-muted mb-3">
                Track lifetime value, purchase history, and usernames across
                platforms.
              </p>
            )}
            <Link
              href="/customers"
              className="text-xs text-navy-700 hover:underline"
            >
              View all customers →
            </Link>
          </CardContent>
        </Card>

        {/* This month's P&L card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">This month&apos;s P&amp;L</CardTitle>
            <CardDescription>
              {now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">Revenue</span>
                <span className="font-medium text-navy-900 tabular-nums">
                  {formatCurrency(monthRevenue)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">Net profit</span>
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    monthNetProfit > 0 && "text-green-700",
                    monthNetProfit < 0 && "text-red-700",
                    monthNetProfit === 0 && "text-navy-900"
                  )}
                >
                  {formatCurrency(monthNetProfit)}
                </span>
              </div>
            </div>
            {monthBreakIds.length === 0 && (
              <p className="text-xs text-ink-subtle mt-3">
                No breaks this month yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {breaks.length === 0 && (
        <div className="card-surface p-6">
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
      )}
    </div>
  );
}
