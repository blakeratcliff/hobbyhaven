import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteBreakButton } from "@/components/breaks/delete-break-button";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { SPORT_LABELS, type SportKey } from "@/lib/constants";

type BreakRow = {
  id: string;
  product_name: string;
  product_year: number | null;
  sport: SportKey;
  league: string | null;
  format: "random_team" | "pyt";
  spots_per_buyer: number;
  box_cost: number | null;
  box_count: number;
  total_product_cost: number;
  status: "planned" | "in_progress" | "completed" | "canceled";
  break_date: string | null;
  notes: string | null;
};

type SpotRow = {
  id: string;
  spot_number: number;
  customer_id: string | null;
  price: number | null;
  shipping_cost: number;
  supplies_cost: number;
  fees_cost: number;
  payment_received: boolean;
  shipped: boolean;
};

type SpotTeamRow = {
  break_spot_id: string;
  teams: {
    id: string;
    name: string;
    abbreviation: string | null;
  };
};

type PnlRow = {
  total_revenue: number;
  gross_profit: number;
  net_profit: number;
  sold_spots: number;
  total_spots: number;
};

const STATUS_LABELS = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  canceled: "Canceled",
};

const STATUS_CLASSES = {
  planned: "bg-cream-100 text-ink-muted",
  in_progress: "bg-navy-100 text-navy-900",
  completed: "bg-green-50 text-green-900",
  canceled: "bg-red-50 text-red-700",
};

const FORMAT_LABELS = {
  random_team: "Random Team",
  pyt: "Pick Your Team",
};

export default async function BreakDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: breakRow } = await supabase
    .from("breaks")
    .select(
      "id, product_name, product_year, sport, league, format, spots_per_buyer, box_cost, box_count, total_product_cost, status, break_date, notes"
    )
    .eq("id", params.id)
    .maybeSingle<BreakRow>();

  if (!breakRow) {
    notFound();
  }

  const { data: spots } = await supabase
    .from("break_spots")
    .select(
      "id, spot_number, customer_id, price, shipping_cost, supplies_cost, fees_cost, payment_received, shipped"
    )
    .eq("break_id", params.id)
    .order("spot_number");
  const spotList = (spots as SpotRow[] | null) || [];

  // Get team names for each spot
  const spotIds = spotList.map((s) => s.id);
  let spotTeams: SpotTeamRow[] = [];
  if (spotIds.length > 0) {
    const { data } = await supabase
      .from("break_spot_teams")
      .select("break_spot_id, teams(id, name, abbreviation)")
      .in("break_spot_id", spotIds);
    spotTeams = (data as SpotTeamRow[] | null) || [];
  }

  // Group teams by spot
  const teamsBySpot = new Map<string, { id: string; name: string; abbreviation: string | null }[]>();
  for (const st of spotTeams) {
    const team = Array.isArray(st.teams) ? st.teams[0] : st.teams;
    if (!team) continue;
    if (!teamsBySpot.has(st.break_spot_id)) {
      teamsBySpot.set(st.break_spot_id, []);
    }
    teamsBySpot.get(st.break_spot_id)!.push(team);
  }

  // Pull P&L
  const { data: pnl } = await supabase
    .from("break_pnl")
    .select("total_revenue, gross_profit, net_profit, sold_spots, total_spots")
    .eq("break_id", params.id)
    .maybeSingle<PnlRow>();

  const breakEvenRemaining =
    breakRow.total_product_cost - (pnl?.total_revenue || 0);

  return (
    <div className="container-app py-10 max-w-4xl">
      <Link
        href="/breaks"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-navy-900 mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to breaks
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl text-navy-900">
              {breakRow.product_year ? `${breakRow.product_year} ` : ""}
              {breakRow.product_name}
            </h1>
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                STATUS_CLASSES[breakRow.status]
              )}
            >
              {STATUS_LABELS[breakRow.status]}
            </span>
          </div>
          <p className="text-sm text-ink-muted">
            {SPORT_LABELS[breakRow.sport]}
            {breakRow.league ? ` · ${breakRow.league}` : ""} ·{" "}
            {FORMAT_LABELS[breakRow.format]}
            {breakRow.break_date && ` · ${formatDate(breakRow.break_date)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DeleteBreakButton breakId={breakRow.id} />
        </div>
      </div>

      {/* P&L summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-ink-subtle mb-1">
              Product cost
            </p>
            <p className="font-serif text-2xl text-navy-900 tabular-nums">
              {formatCurrency(breakRow.total_product_cost)}
            </p>
            {breakRow.box_cost !== null && breakRow.box_count > 1 && (
              <p className="text-xs text-ink-subtle mt-1">
                {formatCurrency(breakRow.box_cost)} × {breakRow.box_count}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-ink-subtle mb-1">
              Revenue
            </p>
            <p className="font-serif text-2xl text-navy-900 tabular-nums">
              {formatCurrency(pnl?.total_revenue || 0)}
            </p>
            <p className="text-xs text-ink-subtle mt-1">
              {pnl?.sold_spots || 0} of {pnl?.total_spots || spotList.length} sold
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-ink-subtle mb-1">
              {breakEvenRemaining > 0 ? "To break even" : "Past break-even"}
            </p>
            <p
              className={cn(
                "font-serif text-2xl tabular-nums",
                breakEvenRemaining > 0 ? "text-red-700" : "text-green-700"
              )}
            >
              {formatCurrency(Math.abs(breakEvenRemaining))}
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
                (pnl?.net_profit || 0) > 0 && "text-green-700",
                (pnl?.net_profit || 0) < 0 && "text-red-700"
              )}
            >
              {formatCurrency(pnl?.net_profit || 0)}
            </p>
            <p className="text-xs text-ink-subtle mt-1">After all fees</p>
          </CardContent>
        </Card>
      </div>

      {/* Spots */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-navy-900">
              Spots ({spotList.length})
            </h2>
            <p className="text-sm text-ink-muted">
              Spot management coming soon
            </p>
          </div>
          {spotList.length === 0 ? (
            <p className="text-sm text-ink-muted">No spots in this break.</p>
          ) : (
            <div className="space-y-2">
              {spotList.map((spot) => {
                const teams = teamsBySpot.get(spot.id) || [];
                return (
                  <div
                    key={spot.id}
                    className="flex items-center gap-3 p-3 rounded-md border border-cream-200 hover:bg-cream-50 transition-colors"
                  >
                    <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-navy-900 text-cream-50 text-xs font-medium flex-shrink-0">
                      {spot.spot_number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy-900 truncate">
                        {teams.length === 0
                          ? "(No teams)"
                          : teams.map((t) => t.name).join(", ")}
                      </p>
                    </div>
                    <div className="text-right">
                      {spot.customer_id ? (
                        <>
                          <p className="text-sm text-navy-900 font-medium tabular-nums">
                            {formatCurrency(spot.price)}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {spot.payment_received && (
                              <span className="text-xs text-green-700">
                                Paid
                              </span>
                            )}
                            {spot.shipped && (
                              <span className="text-xs text-navy-700">
                                Shipped
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-ink-subtle">Unsold</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {breakRow.notes && (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-serif text-lg text-navy-900 mb-3">Notes</h2>
            <p className="text-sm text-ink-muted whitespace-pre-wrap">
              {breakRow.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
