import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { SPORT_LABELS, type SportKey } from "@/lib/constants";

type BreakRow = {
  id: string;
  product_name: string;
  product_year: number | null;
  sport: SportKey;
  league: string | null;
  status: "planned" | "in_progress" | "completed" | "canceled";
  break_date: string | null;
  total_product_cost: number;
  created_at: string;
};

type PnlRow = {
  break_id: string;
  total_revenue: number;
  net_profit: number;
  sold_spots: number;
  total_spots: number;
};

const STATUS_LABELS: Record<BreakRow["status"], string> = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  canceled: "Canceled",
};

const STATUS_CLASSES: Record<BreakRow["status"], string> = {
  planned: "bg-cream-100 text-ink-muted",
  in_progress: "bg-navy-100 text-navy-900",
  completed: "bg-green-50 text-green-900",
  canceled: "bg-red-50 text-red-700",
};

export default async function BreaksPage() {
  const supabase = createClient();

  const { data: breaks } = await supabase
    .from("breaks")
    .select(
      "id, product_name, product_year, sport, league, status, break_date, total_product_cost, created_at"
    )
    .order("created_at", { ascending: false });

  const breakList = (breaks as BreakRow[] | null) || [];

  // Pull P&L stats for each break
  const breakIds = breakList.map((b) => b.id);
  let pnlMap: Record<string, PnlRow> = {};
  let productCountMap: Record<string, number> = {};
  if (breakIds.length > 0) {
    const { data: pnl } = await supabase
      .from("break_pnl")
      .select("break_id, total_revenue, net_profit, sold_spots, total_spots")
      .in("break_id", breakIds);

    pnlMap = ((pnl as PnlRow[] | null) || []).reduce(
      (acc, p) => {
        acc[p.break_id] = p;
        return acc;
      },
      {} as Record<string, PnlRow>
    );

    // Count products per break
    const { data: prods } = await supabase
      .from("break_products")
      .select("break_id")
      .in("break_id", breakIds);
    for (const row of (prods as { break_id: string }[] | null) || []) {
      productCountMap[row.break_id] = (productCountMap[row.break_id] || 0) + 1;
    }
  }

  return (
    <div className="container-app py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl text-navy-900 mb-1">Breaks</h1>
          <p className="text-ink-muted">
            {breakList.length === 0
              ? "No breaks yet."
              : `${breakList.length} ${breakList.length === 1 ? "break" : "breaks"}`}
          </p>
        </div>
        <Link href="/breaks/new">
          <Button>
            <Plus className="h-4 w-4" />
            Plan a break
          </Button>
        </Link>
      </div>

      {breakList.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-ink-muted mb-4">
            Plan your first break to start tracking spots, customers, and
            profit.
          </p>
          <Link href="/breaks/new">
            <Button>
              <Plus className="h-4 w-4" />
              Plan your first break
            </Button>
          </Link>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-cream-100 border-b border-cream-200">
              <tr>
                <th className="text-left text-xs font-medium uppercase tracking-wide text-ink-muted px-6 py-3">
                  Product
                </th>
                <th className="text-left text-xs font-medium uppercase tracking-wide text-ink-muted px-6 py-3 hidden sm:table-cell">
                  Status
                </th>
                <th className="text-right text-xs font-medium uppercase tracking-wide text-ink-muted px-6 py-3 hidden md:table-cell">
                  Sold
                </th>
                <th className="text-right text-xs font-medium uppercase tracking-wide text-ink-muted px-6 py-3 hidden md:table-cell">
                  Revenue
                </th>
                <th className="text-right text-xs font-medium uppercase tracking-wide text-ink-muted px-6 py-3">
                  Net P&L
                </th>
              </tr>
            </thead>
            <tbody>
              {breakList.map((b) => {
                const pnl = pnlMap[b.id];
                const netProfit = pnl?.net_profit || 0;
                return (
                  <tr
                    key={b.id}
                    className="border-b border-cream-100 last:border-0 hover:bg-cream-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/breaks/${b.id}`}
                        className="text-navy-900 font-medium hover:underline"
                      >
                        {b.product_year ? `${b.product_year} ` : ""}
                        {b.product_name}
                        {(productCountMap[b.id] || 1) > 1 && (
                          <span className="text-ink-subtle font-normal">
                            {" "}and {(productCountMap[b.id] || 1) - 1} more
                          </span>
                        )}
                      </Link>
                      <p className="text-xs text-ink-subtle mt-0.5">
                        {SPORT_LABELS[b.sport]}
                        {b.league ? ` · ${b.league}` : ""} · {formatDate(b.break_date || b.created_at)}
                      </p>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          STATUS_CLASSES[b.status]
                        )}
                      >
                        {STATUS_LABELS[b.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm tabular-nums hidden md:table-cell">
                      {pnl ? `${pnl.sold_spots}/${pnl.total_spots}` : "—"}
                    </td>
                    <td className="px-6 py-4 text-right text-sm tabular-nums hidden md:table-cell">
                      {formatCurrency(pnl?.total_revenue || 0)}
                    </td>
                    <td
                      className={cn(
                        "px-6 py-4 text-right text-sm tabular-nums font-medium",
                        netProfit > 0 && "text-green-700",
                        netProfit < 0 && "text-red-700"
                      )}
                    >
                      {formatCurrency(netProfit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
