import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BreakForm } from "@/components/breaks/break-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type Team = {
  id: string;
  sport: string;
  league: string;
  name: string;
  abbreviation: string | null;
};

export default async function NewBreakPage() {
  const supabase = createClient();

  // Pull all teams once. ~250 rows, sub-1KB transfer.
  const { data: teams } = await supabase
    .from("teams")
    .select("id, sport, league, name, abbreviation")
    .order("name");

  return (
    <div className="container-app py-10 max-w-3xl">
      <Link
        href="/breaks"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-navy-900 mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to breaks
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Plan a break</CardTitle>
        </CardHeader>
        <CardContent>
          <BreakForm teams={(teams as Team[] | null) || []} />
        </CardContent>
      </Card>
    </div>
  );
}
