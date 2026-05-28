import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BreakEditForm } from "@/components/breaks/break-edit-form";

type BreakRow = {
  id: string;
  format: "random_team" | "pyt";
  break_date: string | null;
  notes: string | null;
};

type ProductRow = {
  product_name: string;
  product_year: number | null;
  box_cost: number | null;
  box_count: number;
  position: number;
};

export default async function EditBreakPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: breakRow } = await supabase
    .from("breaks")
    .select("id, format, break_date, notes")
    .eq("id", params.id)
    .maybeSingle<BreakRow>();

  if (!breakRow) {
    notFound();
  }

  const { data: productRows } = await supabase
    .from("break_products")
    .select("product_name, product_year, box_cost, box_count, position")
    .eq("break_id", params.id)
    .order("position");

  const products = ((productRows as ProductRow[] | null) || []).map((p) => ({
    product_name: p.product_name,
    product_year: p.product_year?.toString() || "",
    box_cost: p.box_cost?.toString() || "",
    box_count: p.box_count?.toString() || "1",
  }));

  return (
    <div className="container-app py-10 max-w-3xl">
      <Link
        href={`/breaks/${breakRow.id}`}
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-navy-900 mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to break
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Edit break</CardTitle>
        </CardHeader>
        <CardContent>
          <BreakEditForm
            breakId={breakRow.id}
            initialData={{
              format: breakRow.format,
              break_date: breakRow.break_date,
              notes: breakRow.notes,
              products:
                products.length > 0
                  ? products
                  : [{ product_name: "", product_year: "", box_cost: "", box_count: "1" }],
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
