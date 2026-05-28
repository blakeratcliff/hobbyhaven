import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteBreakButton } from "@/components/breaks/delete-break-button";
import { SpotRow } from "@/components/breaks/spot-row";
import { BreakStatusChanger, BulkActionsToolbar } from "@/components/breaks/break-toolbar";
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

type SpotRowData = {
  id: string;
  spot_number: number;
  customer_id: string | null;
  price: number | null;
  shipping_cost: number;
  supplies_cost: number;
  fees_cost: number;
  payment_received: boolean;
  shipped: boolean;
  tracking_number: string | null;
  notes: string | null;
};

type Team = {
  id: string;
  name: string;
  abbreviation: string | null;
  primary_color: string | null;
  text_color: string | null;
};

type SpotTeamRow = {
  break_spot_id: string;
  teams: Team | Team[];
};

type CustomerRow = {
  id: string;
  display_name: string;
};

type PnlRow = {
  total_revenue: number;
  gross_profit: number;
  net_profit: number;
  sold_spots: number;
  total_spots: number;
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
      "id, spot_number, customer_id, price, shipping_cost, supplies_cost, fees_cost, payment_received, shipped, tracking_number, notes"
    )
    .eq("break_id", params.id)
    .order("spot_number");
  const spotList = (spots as SpotRowData[] | null) || [];

  // Get team mappings for each spot
  const spotIds = spotList.map((s) => s.id);
  let spotTeams: SpotTeamRow[] = [];
  if (spotIds.length > 0) {
    const { data } = await supabase
      .from("break_spot_teams")
      .select("break_spot_id, teams(id, name, abbreviation, primary_color, text_color)")
      .in("break_spot_id", spotIds);
    spotTeams = (data as SpotTeamRow[] | null) || [];
  }

  // Group teams by spot
  const teamsBySpot = new Map<string, Team[]>();
  for (const st of spotTeams) {
    const team = Array.isArray(st.teams) ? st.teams[0] : st.teams;
    if (!team) continue;
    if (!teamsBySpot.has(st.break_spot_id)) {
      teamsBySpot.set(st.break_spot_id, []);
    }
    teamsBySpot.get(st.break_spot_id)!.push(team);
  }

  // Get customer names for assigned spots
  const customerIds = spotList
    .map((s) => s.customer_id)
    .filter((id): id is string => !!id);
  const uniqueCustomerIds = Array.from(new Set(customerIds));
  let customerNamesById = new Map<string, string>();
  if (uniqueCustomerIds.length > 0) {
    const { data: customers } = await supabase
      .from("customers")
      .select("id, display_name")
      .in("id", uniqueCustomerIds);
    for (const c of (customers as CustomerRow[] | null) || []) {
      customerNamesById.set(c.id, c.display_name);
    }
  }

  // Pull P&L
  const { data: pnl } = await supabase
    .from("break_pnl")
    .select("total_revenue, gross_profit, net_profit, sold_spots, total_spots")
    .eq("break_id", params.id)
    .maybeSingle<PnlRow>();

  const breakEvenRemaining =
    breakRow.total_product_cost - (pnl?.total_revenue || 0);
  const hasSoldSpots = (pnl?.sold_spots || 0) > 0;

  return (
    <div className="container-app py-10 max-w-4xl">
      <Link
        href="/breaks"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-navy-900 mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to breaks
      </Link>

      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl text-navy-900 mb-1">
            {breakRow.product_year ? `${breakRow.product_year} ` : ""}
            {breakRow.product_name}
          </h1>
          <p className="text-sm text-ink-muted">
            {SPORT_LABELS[breakRow.sport]}
            {breakRow.league ? ` · ${breakRow.league}` : ""} ·{" "}
            {FORMAT_LABELS[breakRow.format]}
            {breakRow.break_date && ` · ${formatDate(breakRow.break_date)}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BreakStatusChanger breakId={breakRow.id} currentStatus={breakRow.status} />
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
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="font-serif text-xl text-navy-900">
              Spots ({spotList.length})
            </h2>
            <BulkActionsToolbar
              breakId={breakRow.id}
              hasSoldSpots={hasSoldSpots}
            />
          </div>
          {spotList.length === 0 ? (
            <p className="text-sm text-ink-muted">No spots in this break.</p>
          ) : (
            <div className="space-y-2">
              {spotList.map((spot) => (
                <SpotRow
                  key={spot.id}
                  breakId={breakRow.id}
                  spot={{
                    id: spot.id,
                    spot_number: spot.spot_number,
                    customer_id: spot.customer_id,
                    customer_name: spot.customer_id
                      ? customerNamesById.get(spot.customer_id) || null
                      : null,
                    price: spot.price,
                    shipping_cost: spot.shipping_cost,
                    supplies_cost: spot.supplies_cost,
                    fees_cost: spot.fees_cost,
                    payment_received: spot.payment_received,
                    shipped: spot.shipped,
                    tracking_number: spot.tracking_number,
                    notes: spot.notes,
                    teams: teamsBySpot.get(spot.id) || [],
                  }}
                />
              ))}
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
