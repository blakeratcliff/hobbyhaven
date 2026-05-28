import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateCustomer } from "@/lib/actions/customers";
import { CustomerForm } from "@/components/customers/customer-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type CustomerRow = {
  id: string;
  display_name: string;
  notes: string | null;
};

type UsernameRow = {
  platform: string;
  username: string;
  is_primary: boolean;
};

export default async function EditCustomerPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("id, display_name, notes")
    .eq("id", params.id)
    .maybeSingle<CustomerRow>();

  if (!customer) {
    notFound();
  }

  const { data: usernameRows } = await supabase
    .from("customer_usernames")
    .select("platform, username, is_primary")
    .eq("customer_id", params.id)
    .order("is_primary", { ascending: false });

  const usernames = (usernameRows as UsernameRow[] | null) || [];

  // Bind customer ID to the update action.
  const action = updateCustomer.bind(null, customer.id);

  return (
    <div className="container-app py-10 max-w-2xl">
      <Link
        href={`/customers/${customer.id}`}
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-navy-900 mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to {customer.display_name}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Edit customer</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm
            action={action}
            initialData={{
              display_name: customer.display_name,
              notes: customer.notes,
              usernames: usernames.map((u) => ({
                platform: u.platform,
                username: u.username,
              })),
            }}
            submitLabel="Save changes"
            cancelHref={`/customers/${customer.id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
