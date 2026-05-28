import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { TeamBadge } from "@/components/breaks/team-badge";
import { RevenueTrendChart } from "@/components/analytics/revenue-trend-chart";
import { formatCurrency, cn } from "@/lib/utils";

type BreakRow = {
  id: string;
  product_name: string;
  product_year: number | null;
  created_at: string;
};

type PnlRow = {
  break_id: string;
  total_revenue: number;
  net_profit: number;
  total_product_cost: number;
  sold_spots: number;
  total_spots: number;
};

type SpotRow = {
  id: string;
  price: number | null;
  customer_id: string | null;
};

type SpotTeamRow = {
  break_spot_id: string;
  teams: {
    id: string;
    name: string;
    abbreviation: string | null;
    primary_color: string | null;
    text_color: string | null;
  } | null;
};

type CustomerStat = {
  customer_id: string;
  display_name: string;
  lifetime_spend: number;
  total_spots_purchased: number;
};

export default async function AnalyticsPage() {
  const supabase = createClient();

  // ---- Load breaks + P&L ----
  const { data: breaksData } = await supabase
    .from("breaks")
    .select("id, product_name, product_year, created_at");
  const breaks = (breaksData as BreakRow[] | null) || [];
  const breakIds = breaks.map((b) => b.id);
  const breakById = new Map(breaks.map((b) => [b.id, b]));

  let pnlByBreak = new Map<string, PnlRow>();
  if (breakIds.length > 0) {
    const { data: pnl } = await supabase
      .from("break_pnl")
      .select(
        "break_id, total_revenue, net_profit, total_product_cost, sold_spots, total_spots"
      )
      .in("break_id", breakIds);
    for (const p of (pnl as PnlRow[] | null) || []) {
      pnlByBreak.set(p.break_id, p);
    }
  }

  // ---- Overall totals ----
  let totalRevenue = 0;
  let totalNetProfit = 0;
  let totalSold = 0;
  let totalSpots = 0;
  for (const p of pnlByBreak.values()) {
    totalRevenue += p.total_revenue || 0;
    totalNetProfit += p.net_profit || 0;
    totalSold += p.sold_spots || 0;
    totalSpots += p.total_spots || 0;
  }
  const sellThrough = totalSpots > 0 ? (totalSold / totalSpots) * 100 : 0;

  // ---- Product performance (group breaks by product name) ----
  type ProductAgg = {
    name: string;
    breakCount: number;
    revenue: number;
    netProfit: number;
    cost: number;
  };
  const productAgg = new Map<string, ProductAgg>();
  for (const b of breaks) {
    const pnl = pnlByBreak.get(b.id);
    if (!pnl) continue;
    const key = b.product_name;
    if (!productAgg.has(key)) {
      productAgg.set(key, {
        name: key,
        breakCount: 0,
        revenue: 0,
        netProfit: 0,
        cost: 0,
      });
    }
    const agg = productAgg.get(key)!;
    agg.breakCount += 1;
    agg.revenue += pnl.total_revenue || 0;
    agg.netProfit += pnl.net_profit || 0;
    agg.cost += pnl.total_product_cost || 0;
  }
  const productList = Array.from(productAgg.values())
    .map((p) => ({
      ...p,
      margin: p.revenue > 0 ? (p.netProfit / p.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.netProfit - a.netProfit);

  // ---- Team values (avg sale price per team) ----
  // Load all spots with prices, plus their team mappings.
  let teamAgg = new Map<
    string,
    {
      team: SpotTeamRow["teams"];
      totalValue: number;
      spotCount: number;
    }
  >();

  if (breakIds.length > 0) {
    const { data: spotsData } = await supabase
      .from("break_spots")
      .select("id, price, customer_id, break_id")
      .in("break_id", breakIds);
    const spots = (spotsData as (SpotRow & { break_id: string })[] | null) || [];
    const soldSpots = spots.filter((s) => s.customer_id && s.price);
    const soldSpotById = new Map(soldSpots.map((s) => [s.id, s]));
    const soldSpotIds = soldSpots.map((s) => s.id);

    if (soldSpotIds.length > 0) {
      const { data: stData } = await supabase
        .from("break_spot_teams")
        .select(
          "break_spot_id, teams(id, name, abbreviation, primary_color, text_color)"
        )
        .in("break_spot_id", soldSpotIds);
      const spotTeams = (stData as SpotTeamRow[] | null) || [];

      // Count how many teams are in each spot (to split price evenly)
      const teamsPerSpot = new Map<string, number>();
      for (const st of spotTeams) {
        teamsPerSpot.set(
          st.break_spot_id,
          (teamsPerSpot.get(st.break_spot_id) || 0) + 1
        );
      }

      for (const st of spotTeams) {
        const team = Array.isArray(st.teams) ? st.teams[0] : st.teams;
        if (!team) continue;
        const spot = soldSpotById.get(st.break_spot_id);
        if (!spot || !spot.price) continue;
        const split = spot.price / (teamsPerSpot.get(st.break_spot_id) || 1);
        if (!teamAgg.has(team.id)) {
          teamAgg.set(team.id, { team, totalValue: 0, spotCount: 0 });
        }
        const agg = teamAgg.get(team.id)!;
        agg.totalValue += split;
        agg.spotCount += 1;
      }
    }
  }

  const teamList = Array.from(teamAgg.values())
    .map((t) => ({
      team: t.team!,
      avgValue: t.spotCount > 0 ? t.totalValue / t.spotCount : 0,
      spotCount: t.spotCount,
    }))
    .sort((a, b) => b.avgValue - a.avgValue)
    .slice(0, 12);

  // ---- Customer insights ----
  const { data: custStats } = await supabase
    .from("customer_stats")
    .select("customer_id, display_name, lifetime_spend, total_spots_purchased");
  const customers = (custStats as CustomerStat[] | null) || [];
  const payingCustomers = customers.filter((c) => c.lifetime_spend > 0);
  const repeatCustomers = customers.filter((c) => c.total_spots_purchased >= 2);
  const repeatRate =
    payingCustomers.length > 0
      ? (repeatCustomers.length / payingCustomers.length) * 100
      : 0;
  const topCustomers = [...payingCustomers]
    .sort((a, b) => b.lifetime_spend - a.lifetime_spend)
    .slice(0, 8);

  // ---- Monthly trends ----
  const monthly = new Map<string, { revenue: number; profit: number }>();
  for (const b of breaks) {
    const pnl = pnlByBreak.get(b.id);
    if (!pnl) continue;
    const d = new Date(b.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthly.has(key)) monthly.set(key, { revenue: 0, profit: 0 });
    const m = monthly.get(key)!;
    m.revenue += pnl.total_revenue || 0;
    m.profit += pnl.net_profit || 0;
  }
  const monthlyData = Array.from(monthly.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, vals]) => {
      const [year, month] = key.split("-");
      const label = new Date(
        parseInt(year),
        parseInt(month) - 1,
        1
      ).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      return { label, revenue: vals.revenue, profit: vals.profit };
    });

  const hasData = breaks.length > 0;

  return (
    <div className="container-app py-10">
      <div className="mb-8">
        <h1 className="text-3xl text-navy-900 mb-1">Analytics</h1>
        <p className="text-ink-muted">
          Insights from your breaks, customers, and sales.
        </p>
      </div>

      {!hasData ? (
        <Card className="p-12 text-center">
          <p className="text-ink-muted mb-4">
            No data yet. Run some breaks and your analytics will appear here.
          </p>
          <Link href="/breaks/new" className="text-navy-700 hover:underline text-sm">
            Plan your first break →
          </Link>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Headline numbers */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-ink-subtle mb-1">
                  Total revenue
                </p>
                <p className="font-serif text-2xl text-navy-900 tabular-nums">
                  {formatCurrency(totalRevenue)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-ink-subtle mb-1">
                  Net profit
                </p>
                <p
                  className={cn(
                    "font-serif text-2xl tabular-nums",
                    totalNetProfit > 0 && "text-green-700",
                    totalNetProfit < 0 && "text-red-700",
                    totalNetProfit === 0 && "text-navy-900"
                  )}
                >
                  {formatCurrency(totalNetProfit)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-ink-subtle mb-1">
                  Sell-through
                </p>
                <p className="font-serif text-2xl text-navy-900 tabular-nums">
                  {sellThrough.toFixed(0)}%
                </p>
                <p className="text-xs text-ink-subtle mt-1">
                  {totalSold} of {totalSpots} spots
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-ink-subtle mb-1">
                  Repeat rate
                </p>
                <p className="font-serif text-2xl text-navy-900 tabular-nums">
                  {repeatRate.toFixed(0)}%
                </p>
                <p className="text-xs text-ink-subtle mt-1">
                  {repeatCustomers.length} of {payingCustomers.length} customers
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue trend */}
          {monthlyData.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-serif text-xl text-navy-900 mb-4">
                  Revenue &amp; profit over time
                </h2>
                <RevenueTrendChart data={monthlyData} />
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product performance */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-serif text-xl text-navy-900 mb-4">
                  Product performance
                </h2>
                {productList.length === 0 ? (
                  <p className="text-sm text-ink-muted">No products yet.</p>
                ) : (
                  <div className="space-y-2">
                    {productList.slice(0, 8).map((p) => (
                      <div
                        key={p.name}
                        className="flex items-center justify-between gap-3 py-2 border-b border-cream-100 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-navy-900 truncate">
                            {p.name}
                          </p>
                          <p className="text-xs text-ink-subtle">
                            {p.breakCount}{" "}
                            {p.breakCount === 1 ? "break" : "breaks"} ·{" "}
                            {p.margin.toFixed(0)}% margin
                          </p>
                        </div>
                        <p
                          className={cn(
                            "text-sm font-medium tabular-nums flex-shrink-0",
                            p.netProfit > 0 && "text-green-700",
                            p.netProfit < 0 && "text-red-700",
                            p.netProfit === 0 && "text-navy-900"
                          )}
                        >
                          {formatCurrency(p.netProfit)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team values */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-serif text-xl text-navy-900 mb-4">
                  Most valuable teams
                </h2>
                <p className="text-xs text-ink-subtle mb-3">
                  Average sale price per spot, across your sold spots.
                </p>
                {teamList.length === 0 ? (
                  <p className="text-sm text-ink-muted">
                    No sold spots yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {teamList.map((t) => (
                      <div
                        key={t.team.id}
                        className="flex items-center justify-between gap-3 py-1.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <TeamBadge team={t.team} variant="abbr" />
                          <span className="text-sm text-navy-900 truncate">
                            {t.team.name}
                          </span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-sm font-medium text-navy-900 tabular-nums">
                            {formatCurrency(t.avgValue)}
                          </span>
                          <span className="text-xs text-ink-subtle ml-2">
                            ({t.spotCount})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top customers */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-serif text-xl text-navy-900 mb-4">
                Top customers
              </h2>
              {topCustomers.length === 0 ? (
                <p className="text-sm text-ink-muted">No paying customers yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                  {topCustomers.map((c, idx) => (
                    <Link
                      key={c.customer_id}
                      href={`/customers/${c.customer_id}`}
                      className="flex items-center justify-between gap-3 py-2 border-b border-cream-100 hover:bg-cream-50 -mx-2 px-2 rounded transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-ink-subtle tabular-nums w-4">
                          {idx + 1}
                        </span>
                        <span className="text-sm text-navy-900 font-medium truncate">
                          {c.display_name}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-sm font-medium text-navy-900 tabular-nums">
                          {formatCurrency(c.lifetime_spend)}
                        </span>
                        <span className="text-xs text-ink-subtle ml-2">
                          {c.total_spots_purchased}{" "}
                          {c.total_spots_purchased === 1 ? "spot" : "spots"}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
