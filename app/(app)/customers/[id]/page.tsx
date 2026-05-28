import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteCustomerButton } from "@/components/customers/delete-customer-button";
import { formatCurrency, formatDate } from "@/lib/utils";

type CustomerRow = {
  id: string;
  display_name: string;
  notes: string | null;
  created_at: string;
};

type UsernameRow = {
  id: string;
  platform: string;
  username: string;
  is_primary: boolean;
};

type StatsRow = {
  lifetime_spend: number;
  total_breaks: number;
  total_spots_purchased: number;
  last_purchase_date: string | null;
};

const PLATFORM_LABELS: Record<string, string> = {
  whatnot: "Whatnot",
  fanatics_live: "Fanatics Live",
  discord: "Discord",
  ebay: "eBay",
  instagram: "Instagram",
  twitter: "Twitter / X",
  other: "Other",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("id, display_name, notes, created_at")
    .eq("id", params.id)
    .maybeSingle<CustomerRow>();

  if (!customer) {
    notFound();
  }

  const { data: usernameRows } = await supabase
    .from("customer_usernames")
    .select("id, platform, username, is_primary")
    .eq("customer_id", params.id)
    .order("is_primary", { ascending: false });
  const usernames = (usernameRows as UsernameRow[] | null) || [];

  const { data: statsRow } = await supabase
    .from("customer_stats")
    .select(
      "lifetime_spend, total_breaks, total_spots_purchased, last_purchase_date"
    )
    .eq("customer_id", params.id)
    .maybeSingle<StatsRow>();

  return (
    <div className="container-app py-10 max-w-3xl">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-navy-900 mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to customers
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl text-navy-900 mb-1">
            {customer.display_name}
          </h1>
          <p className="text-sm text-ink-muted">
            Added {formatDate(customer.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/customers/${customer.id}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </Link>
          <DeleteCustomerButton customerId={customer.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-ink-subtle mb-1">
              Lifetime spend
            </p>
            <p className="font-serif text-2xl text-navy-900 tabular-nums">
              {formatCurrency(statsRow?.lifetime_spend || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-ink-subtle mb-1">
              Spots purchased
            </p>
            <p className="font-serif text-2xl text-navy-900 tabular-nums">
              {statsRow?.total_spots_purchased || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-ink-subtle mb-1">
              Last purchase
            </p>
            <p className="font-serif text-2xl text-navy-900">
              {statsRow?.last_purchase_date
                ? formatDate(statsRow.last_purchase_date)
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg text-navy-900 mb-4">Usernames</h2>
          {usernames.length === 0 ? (
            <p className="text-sm text-ink-muted">No usernames on file.</p>
          ) : (
            <ul className="space-y-2">
              {usernames.map((u) => (
                <li key={u.id} className="flex items-center gap-3 text-sm">
                  <span className="inline-flex items-center justify-center min-w-[110px] px-2 py-1 rounded bg-cream-100 text-ink-muted text-xs">
                    {PLATFORM_LABELS[u.platform] || u.platform}
                  </span>
                  <span className="text-navy-900 font-medium">
                    {u.username}
                  </span>
                  {u.is_primary && (
                    <span className="text-xs text-gold font-medium">
                      Primary
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {customer.notes && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg text-navy-900 mb-3">Notes</h2>
            <p className="text-sm text-ink-muted whitespace-pre-wrap">
              {customer.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
