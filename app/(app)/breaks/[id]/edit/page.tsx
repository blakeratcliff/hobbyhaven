import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BreakEditForm } from "@/components/breaks/break-edit-form";

type BreakRow = {
  id: string;
  product_name: string;
  product_year: number | null;
  format: "random_team" | "pyt";
  box_cost: number | null;
  box_count: number;
  break_date: string | null;
  notes: string | null;
};

export default async function EditBreakPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: breakRow } = await supabase
    .from("breaks")
    .select(
      "id, product_name, product_year, format, box_cost, box_count, break_date, notes"
    )
    .eq("id", params.id)
    .maybeSingle<BreakRow>();

  if (!breakRow) {
    notFound();
  }

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
              product_name: breakRow.product_name,
              product_year: breakRow.product_year,
              format: breakRow.format,
              box_cost: breakRow.box_cost,
              box_count: breakRow.box_count,
              break_date: breakRow.break_date,
              notes: breakRow.notes,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
