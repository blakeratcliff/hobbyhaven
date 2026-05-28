import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteBreakButton } from "@/components/breaks/delete-break-button";
import { SpotRow } from "@/components/breaks/spot-row";
import { SpotViewToggle } from "@/components/breaks/spot-view-toggle";
import { AddSpotControl } from "@/components/breaks/add-spot-control";
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

  // Load products for this break
  const { data: productRows } = await supabase
    .from("break_products")
    .select("id, product_name, product_year, box_cost, box_count, line_total, position")
    .eq("break_id", params.id)
    .order("position");
  type ProductRow = {
    id: string;
    product_name: string;
    product_year: number | null;
    box_cost: number | null;
    box_count: number;
    line_total: number;
    position: number;
  };
  const products = (productRows as ProductRow[] | null) || [];

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

  // Flat break-even per spot (cost / total spots)
  const flatBreakEvenPerSpot =
    spotList.length > 0 ? breakRow.total_product_cost / spotList.length : 0;

  // Remaining-spot break-even: how much each UNSOLD spot needs to average to break even
  const unsoldSpotCount = spotList.length - (pnl?.sold_spots || 0);
  const avgUnsoldNeeded =
    unsoldSpotCount > 0 && breakEvenRemaining > 0
      ? breakEvenRemaining / unsoldSpotCount
      : 0;

  // Fetch all teams for the break's sport+league for the AddSpotControl
  const { data: allTeams } = await supabase
    .from("teams")
    .select("id, name, abbreviation, primary_color, text_color")
    .eq("sport", breakRow.sport)
    .eq("league", breakRow.league || "")
    .order("name");

  // Filter out teams already assigned to any spot in this break
  const assignedTeamIds = new Set<string>();
  for (const teams of teamsBySpot.values()) {
    for (const t of teams) assignedTeamIds.add(t.id);
  }
  const availableTeams = ((allTeams as Team[] | null) || []).filter(
    (t) => !assignedTeamIds.has(t.id)
  );

  // Build customer-grouped view data
  type CustomerGroup = {
    customer_id: string;
    customer_name: string;
    spot_count: number;
    total_spend: number;
    all_paid: boolean;
    all_shipped: boolean;
    spots: {
      id: string;
      spot_number: number;
      price: number | null;
      payment_received: boolean;
      shipped: boolean;
      teams: Team[];
    }[];
  };

  const customerGroupMap = new Map<string, CustomerGroup>();
  for (const spot of spotList) {
    if (!spot.customer_id) continue;
    const customerName = customerNamesById.get(spot.customer_id) || "Unknown";
    if (!customerGroupMap.has(spot.customer_id)) {
      customerGroupMap.set(spot.customer_id, {
        customer_id: spot.customer_id,
        customer_name: customerName,
        spot_count: 0,
        total_spend: 0,
        all_paid: true,
        all_shipped: true,
        spots: [],
      });
    }
    const g = customerGroupMap.get(spot.customer_id)!;
    g.spot_count += 1;
    g.total_spend += spot.price || 0;
    if (!spot.payment_received) g.all_paid = false;
    if (!spot.shipped) g.all_shipped = false;
    g.spots.push({
      id: spot.id,
      spot_number: spot.spot_number,
      price: spot.price,
      payment_received: spot.payment_received,
      shipped: spot.shipped,
      teams: teamsBySpot.get(spot.id) || [],
    });
  }

  const customerGroups = Array.from(customerGroupMap.values()).sort(
    (a, b) => b.total_spend - a.total_spend
  );

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
            {products.length > 0 ? (
              <>
                {products[0].product_year ? `${products[0].product_year} ` : ""}
                {products[0].product_name}
                {products.length > 1 && (
                  <span className="text-ink-muted">
                    {" "}and {products.length - 1} more
                  </span>
                )}
              </>
            ) : (
              <>
                {breakRow.product_year ? `${breakRow.product_year} ` : ""}
                {breakRow.product_name}
              </>
            )}
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
          <Link href={`/breaks/${breakRow.id}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </Link>
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
            {products.length > 1 ? (
              <p className="text-xs text-ink-subtle mt-1">
                {products.length} products
              </p>
            ) : (
              breakRow.box_cost !== null &&
              breakRow.box_count > 1 && (
                <p className="text-xs text-ink-subtle mt-1">
                  {formatCurrency(breakRow.box_cost)} × {breakRow.box_count}
                </p>
              )
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
            {avgUnsoldNeeded > 0 && (
              <p className="text-xs text-ink-subtle mt-1">
                {formatCurrency(avgUnsoldNeeded)} avg / unsold spot
              </p>
            )}
            {breakEvenRemaining <= 0 && (
              <p className="text-xs text-ink-subtle mt-1">
                Every additional sale is profit
              </p>
            )}
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

      {/* Products breakdown (only for mixers) */}
      {products.length > 1 && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="font-serif text-xl text-navy-900 mb-4">
              Products ({products.length})
            </h2>
            <div className="space-y-2">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-md border border-cream-200"
                >
                  <div>
                    <p className="text-sm font-medium text-navy-900">
                      {p.product_year ? `${p.product_year} ` : ""}
                      {p.product_name}
                    </p>
                    {p.box_cost !== null && (
                      <p className="text-xs text-ink-subtle">
                        {formatCurrency(p.box_cost)} × {p.box_count}{" "}
                        {p.box_count === 1 ? "box" : "boxes"}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-medium text-navy-900 tabular-nums">
                    {formatCurrency(p.line_total)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spots */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
            <div>
              <h2 className="font-serif text-xl text-navy-900">
                Spots ({spotList.length})
              </h2>
              {flatBreakEvenPerSpot > 0 && (
                <p className="text-xs text-ink-muted mt-0.5">
                  Flat break-even: {formatCurrency(flatBreakEvenPerSpot)} per spot
                </p>
              )}
            </div>
            <BulkActionsToolbar
              breakId={breakRow.id}
              hasSoldSpots={hasSoldSpots}
            />
          </div>
          {spotList.length === 0 ? (
            <p className="text-sm text-ink-muted">No spots in this break.</p>
          ) : (
            <SpotViewToggle
              customerGroups={customerGroups}
              spotView={
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
              }
            />
          )}
          <div className="mt-4">
            <AddSpotControl
              breakId={breakRow.id}
              availableTeams={availableTeams}
            />
          </div>
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
