import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createCustomer } from "@/lib/actions/customers";
import { CustomerForm } from "@/components/customers/customer-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function NewCustomerPage() {
  return (
    <div className="container-app py-10 max-w-2xl">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-navy-900 mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to customers
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Add a customer</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm
            action={createCustomer}
            submitLabel="Create customer"
            cancelHref="/customers"
          />
        </CardContent>
      </Card>
    </div>
  );
}
