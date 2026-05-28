"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ============================================================
// Validation
// ============================================================
const breakCreateSchema = z.object({
  product_name: z.string().trim().min(1, "Product name is required").max(200),
  product_year: z
    .union([z.number().int().min(1980).max(2100), z.literal(null)])
    .optional()
    .nullable(),
  sport: z.enum(["baseball", "basketball", "football", "hockey", "soccer"]),
  league: z.string().trim().max(50).optional().nullable(),
  format: z.enum(["random_team", "pyt"]),
  spots_per_buyer: z.number().int().min(1).max(50).default(1),
  box_cost: z.number().min(0).optional().nullable(),
  box_count: z.number().int().min(1).default(1),
  total_product_cost: z.number().min(0).default(0),
  break_date: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().or(z.literal("")),
  team_ids: z.array(z.string().uuid()).min(1, "Select at least one team"),
});

export type ActionResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

// ============================================================
// Helper: get current org_id
// ============================================================
async function requireOrgId() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle<{ org_id: string }>();

  if (!profile) throw new Error("No organization found");
  return { supabase, orgId: profile.org_id, userId: user.id };
}

// ============================================================
// Parse spot assignments from FormData
// Expected format:
//   spot_count = total number of spots
//   spot_<i>_team_<j> = team_id (one entry per team assigned to spot i)
// ============================================================
function parseSpotAssignments(
  formData: FormData
): { spotNumber: number; teamIds: string[] }[] {
  const spotCount = parseInt(formData.get("spot_count") as string, 10) || 0;
  const spots: { spotNumber: number; teamIds: string[] }[] = [];

  for (let i = 1; i <= spotCount; i++) {
    const teamIds: string[] = [];
    for (const [key, value] of formData.entries()) {
      const match = key.match(new RegExp(`^spot_${i}_team_`));
      if (match && typeof value === "string") {
        teamIds.push(value);
      }
    }
    spots.push({ spotNumber: i, teamIds });
  }

  return spots;
}

// ============================================================
// CREATE
// ============================================================
export async function createBreak(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  // Collect team ids that are assigned anywhere
  const allTeamIds = new Set<string>();
  const spots = parseSpotAssignments(formData);
  for (const spot of spots) {
    for (const teamId of spot.teamIds) {
      allTeamIds.add(teamId);
    }
  }

  // Numeric coercion helpers
  const parseNumOrNull = (key: string): number | null => {
    const v = formData.get(key);
    if (typeof v !== "string" || v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const parseIntOrDefault = (key: string, def: number): number => {
    const v = formData.get(key);
    if (typeof v !== "string" || v.trim() === "") return def;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : def;
  };

  const boxCost = parseNumOrNull("box_cost");
  const boxCount = parseIntOrDefault("box_count", 1);
  const computedProductCost =
    boxCost !== null ? +(boxCost * boxCount).toFixed(2) : 0;

  const parsed = breakCreateSchema.safeParse({
    product_name: formData.get("product_name"),
    product_year: parseNumOrNull("product_year"),
    sport: formData.get("sport"),
    league: formData.get("league") || null,
    format: formData.get("format"),
    spots_per_buyer: parseIntOrDefault("spots_per_buyer", 1),
    box_cost: boxCost,
    box_count: boxCount,
    total_product_cost: computedProductCost,
    break_date: formData.get("break_date") || null,
    notes: formData.get("notes") || "",
    team_ids: Array.from(allTeamIds),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { supabase, orgId } = await requireOrgId();

  // Insert the break
  const { data: breakRow, error: breakError } = await supabase
    .from("breaks")
    .insert({
      org_id: orgId,
      product_name: parsed.data.product_name,
      product_year: parsed.data.product_year,
      sport: parsed.data.sport,
      league: parsed.data.league,
      format: parsed.data.format,
      spots_per_buyer: parsed.data.spots_per_buyer,
      box_cost: parsed.data.box_cost,
      box_count: parsed.data.box_count,
      total_product_cost: parsed.data.total_product_cost,
      break_date: parsed.data.break_date || null,
      notes: parsed.data.notes || null,
      status: "planned",
    })
    .select("id")
    .single();

  if (breakError || !breakRow) {
    return { ok: false, message: breakError?.message || "Failed to create" };
  }

  // Insert spots with their team mappings
  const spotsToInsert = spots.map((s) => ({
    break_id: breakRow.id,
    spot_number: s.spotNumber,
  }));

  const { data: insertedSpots, error: spotsError } = await supabase
    .from("break_spots")
    .insert(spotsToInsert)
    .select("id, spot_number");

  if (spotsError) {
    return { ok: false, message: `Spots failed: ${spotsError.message}` };
  }

  // Map spot_number → inserted id, then build break_spot_teams rows
  const spotIdByNumber = new Map<number, string>();
  for (const s of insertedSpots as { id: string; spot_number: number }[]) {
    spotIdByNumber.set(s.spot_number, s.id);
  }

  const teamRows: { break_spot_id: string; team_id: string }[] = [];
  for (const spot of spots) {
    const spotId = spotIdByNumber.get(spot.spotNumber);
    if (!spotId) continue;
    for (const teamId of spot.teamIds) {
      teamRows.push({ break_spot_id: spotId, team_id: teamId });
    }
  }

  if (teamRows.length > 0) {
    const { error: teamsError } = await supabase
      .from("break_spot_teams")
      .insert(teamRows);
    if (teamsError) {
      return { ok: false, message: `Team assignments failed: ${teamsError.message}` };
    }
  }

  revalidatePath("/breaks");
  redirect(`/breaks/${breakRow.id}`);
}

// ============================================================
// UPDATE BREAK (product info, costs, notes, date)
// ============================================================
const breakUpdateSchema = z.object({
  product_name: z.string().trim().min(1, "Product name is required").max(200),
  product_year: z
    .union([z.number().int().min(1980).max(2100), z.literal(null)])
    .optional()
    .nullable(),
  format: z.enum(["random_team", "pyt"]),
  box_cost: z.number().min(0).optional().nullable(),
  box_count: z.number().int().min(1).default(1),
  total_product_cost: z.number().min(0).default(0),
  break_date: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export async function updateBreak(
  breakId: string,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parseNumOrNull = (key: string): number | null => {
    const v = formData.get(key);
    if (typeof v !== "string" || v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const parseIntOrDefault = (key: string, def: number): number => {
    const v = formData.get(key);
    if (typeof v !== "string" || v.trim() === "") return def;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : def;
  };

  const boxCost = parseNumOrNull("box_cost");
  const boxCount = parseIntOrDefault("box_count", 1);
  const computedProductCost =
    boxCost !== null ? +(boxCost * boxCount).toFixed(2) : 0;

  const parsed = breakUpdateSchema.safeParse({
    product_name: formData.get("product_name"),
    product_year: parseNumOrNull("product_year"),
    format: formData.get("format"),
    box_cost: boxCost,
    box_count: boxCount,
    total_product_cost: computedProductCost,
    break_date: formData.get("break_date") || null,
    notes: formData.get("notes") || "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { supabase } = await requireOrgId();

  const { error } = await supabase
    .from("breaks")
    .update({
      product_name: parsed.data.product_name,
      product_year: parsed.data.product_year,
      format: parsed.data.format,
      box_cost: parsed.data.box_cost,
      box_count: parsed.data.box_count,
      total_product_cost: parsed.data.total_product_cost,
      break_date: parsed.data.break_date || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", breakId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/breaks/${breakId}`);
  revalidatePath("/breaks");
  redirect(`/breaks/${breakId}`);
}

// ============================================================
// DELETE
// ============================================================
export async function deleteBreak(breakId: string): Promise<ActionResult> {
  const { supabase } = await requireOrgId();

  const { error } = await supabase.from("breaks").delete().eq("id", breakId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/breaks");
  redirect("/breaks");
}
