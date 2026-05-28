"use client";

import { useState } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { CheckCircle2, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TeamBadge } from "@/components/breaks/team-badge";

type Team = {
  id: string;
  name: string;
  abbreviation: string | null;
  primary_color: string | null;
  text_color: string | null;
};

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

type Props = {
  spotView: React.ReactNode;
  customerGroups: CustomerGroup[];
};

export function SpotViewToggle({ spotView, customerGroups }: Props) {
  const [view, setView] = useState<"spot" | "customer">("spot");

  return (
    <div>
      <div className="flex items-center gap-1 mb-4 bg-cream-100 border border-cream-200 rounded-md p-1 w-fit">
        <button
          type="button"
          onClick={() => setView("spot")}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded transition-colors",
            view === "spot"
              ? "bg-white text-navy-900 shadow-card"
              : "text-ink-muted hover:text-navy-900"
          )}
        >
          By spot
        </button>
        <button
          type="button"
          onClick={() => setView("customer")}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded transition-colors",
            view === "customer"
              ? "bg-white text-navy-900 shadow-card"
              : "text-ink-muted hover:text-navy-900"
          )}
        >
          By customer ({customerGroups.length})
        </button>
      </div>

      {view === "spot" ? (
        spotView
      ) : (
        <CustomerView groups={customerGroups} />
      )}
    </div>
  );
}

function CustomerView({ groups }: { groups: CustomerGroup[] }) {
  if (groups.length === 0) {
    return (
      <p className="text-sm text-ink-muted py-4 text-center">
        No customers assigned to spots yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <Card key={g.customer_id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
              <div>
                <p className="font-medium text-navy-900">{g.customer_name}</p>
                <p className="text-xs text-ink-muted">
                  {g.spot_count} {g.spot_count === 1 ? "spot" : "spots"}
                </p>
              </div>
              <div className="text-right flex items-center gap-3">
                <div>
                  <p className="font-medium text-navy-900 tabular-nums">
                    {formatCurrency(g.total_spend)}
                  </p>
                  <div className="flex items-center gap-1.5 justify-end mt-0.5">
                    {g.all_paid && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700">
                        <CheckCircle2 className="h-3 w-3" />
                        All paid
                      </span>
                    )}
                    {g.all_shipped && (
                      <span className="inline-flex items-center gap-1 text-xs text-navy-700">
                        <Truck className="h-3 w-3" />
                        All shipped
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              {g.spots.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 text-xs text-ink-muted bg-cream-50 rounded px-2 py-1.5"
                >
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-navy-900 text-cream-50 text-[10px] font-medium flex-shrink-0">
                    {s.spot_number}
                  </span>
                  <div className="flex-1 flex flex-wrap gap-1 min-w-0">
                    {s.teams.length === 0 ? (
                      <span className="italic text-ink-subtle">No teams</span>
                    ) : (
                      s.teams.map((t) => (
                        <TeamBadge key={t.id} team={t} variant="abbr" />
                      ))
                    )}
                  </div>
                  <span className="tabular-nums font-medium text-navy-900 flex-shrink-0">
                    {formatCurrency(s.price)}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {s.payment_received && (
                      <CheckCircle2 className="h-3 w-3 text-green-700" />
                    )}
                    {s.shipped && (
                      <Truck className="h-3 w-3 text-navy-700" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
