import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

type CustomerRow = {
  id: string;
  display_name: string;
  notes: string | null;
};

type CustomerStatsRow = {
  customer_id: string;
  display_name: string;
  lifetime_spend: number;
  total_breaks: number;
  total_spots_purchased: number;
  last_purchase_date: string | null;
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  const search = searchParams.q?.trim() || "";

  // Fetch customers, filtered by name if there's a search query.
  let query = supabase
    .from("customers")
    .select("id, display_name, notes")
    .order("display_name", { ascending: true });

  if (search) {
    query = query.ilike("display_name", `%${search}%`);
  }

  const { data: customers } = await query;
  const customerList = (customers as CustomerRow[] | null) || [];

  // Fetch stats for the ones we have.
  const customerIds = customerList.map((c) => c.id);
  let statsMap: Record<string, CustomerStatsRow> = {};
  if (customerIds.length > 0) {
    const { data: stats } = await supabase
      .from("customer_stats")
      .select(
        "customer_id, display_name, lifetime_spend, total_breaks, total_spots_purchased, last_purchase_date"
      )
      .in("customer_id", customerIds);

    statsMap = ((stats as CustomerStatsRow[] | null) || []).reduce(
      (acc, s) => {
        acc[s.customer_id] = s;
        return acc;
      },
      {} as Record<string, CustomerStatsRow>
    );
  }

  return (
    <div className="container-app py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl text-navy-900 mb-1">Customers</h1>
          <p className="text-ink-muted">
            {customerList.length === 0
              ? "No customers yet."
              : `${customerList.length} ${customerList.length === 1 ? "customer" : "customers"}`}
          </p>
        </div>
        <Link href="/customers/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add customer
          </Button>
        </Link>
      </div>

      <form action="/customers" method="get" className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-subtle pointer-events-none" />
          <Input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Search customers..."
            className="pl-9"
          />
        </div>
      </form>

      {customerList.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-ink-muted mb-4">
            {search
              ? "No customers match your search."
              : "Add your first customer to start tracking lifetime value across breaks."}
          </p>
          {!search && (
            <Link href="/customers/new">
              <Button>
                <Plus className="h-4 w-4" />
                Add your first customer
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-cream-100 border-b border-cream-200">
              <tr>
                <th className="text-left text-xs font-medium uppercase tracking-wide text-ink-muted px-6 py-3">
                  Name
                </th>
                <th className="text-right text-xs font-medium uppercase tracking-wide text-ink-muted px-6 py-3">
                  Lifetime spend
                </th>
                <th className="text-right text-xs font-medium uppercase tracking-wide text-ink-muted px-6 py-3 hidden sm:table-cell">
                  Spots
                </th>
                <th className="text-right text-xs font-medium uppercase tracking-wide text-ink-muted px-6 py-3 hidden md:table-cell">
                  Last purchase
                </th>
              </tr>
            </thead>
            <tbody>
              {customerList.map((c) => {
                const stats = statsMap[c.id];
                return (
                  <tr
                    key={c.id}
                    className="border-b border-cream-100 last:border-0 hover:bg-cream-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/customers/${c.id}`}
                        className="text-navy-900 font-medium hover:underline"
                      >
                        {c.display_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right text-sm tabular-nums">
                      {formatCurrency(stats?.lifetime_spend || 0)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm tabular-nums hidden sm:table-cell">
                      {stats?.total_spots_purchased || 0}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-ink-muted hidden md:table-cell">
                      {formatDate(stats?.last_purchase_date)}
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
