"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

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
  return { supabase, orgId: profile.org_id };
}

// ============================================================
// UPDATE SPOT (assign customer, price, fees, status)
// ============================================================
const spotUpdateSchema = z.object({
  customer_id: z.string().uuid().nullable().optional(),
  price: z.number().min(0).nullable().optional(),
  shipping_cost: z.number().min(0).default(0),
  supplies_cost: z.number().min(0).default(0),
  fees_cost: z.number().min(0).default(0),
  payment_received: z.boolean().default(false),
  shipped: z.boolean().default(false),
  tracking_number: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function updateSpot(
  spotId: string,
  breakId: string,
  values: {
    customer_id?: string | null;
    price?: number | null;
    shipping_cost?: number;
    supplies_cost?: number;
    fees_cost?: number;
    payment_received?: boolean;
    shipped?: boolean;
    tracking_number?: string | null;
    notes?: string | null;
  }
): Promise<ActionResult> {
  const parsed = spotUpdateSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid input.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { supabase } = await requireOrgId();

  // Build update payload, only including provided fields.
  const update: Record<string, unknown> = {};
  if (values.customer_id !== undefined) update.customer_id = values.customer_id;
  if (values.price !== undefined) update.price = values.price;
  if (values.shipping_cost !== undefined) update.shipping_cost = values.shipping_cost;
  if (values.supplies_cost !== undefined) update.supplies_cost = values.supplies_cost;
  if (values.fees_cost !== undefined) update.fees_cost = values.fees_cost;
  if (values.payment_received !== undefined) update.payment_received = values.payment_received;
  if (values.shipped !== undefined) {
    update.shipped = values.shipped;
    update.shipped_at = values.shipped ? new Date().toISOString() : null;
  }
  if (values.tracking_number !== undefined) update.tracking_number = values.tracking_number;
  if (values.notes !== undefined) update.notes = values.notes;

  const { error } = await supabase
    .from("break_spots")
    .update(update)
    .eq("id", spotId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/breaks/${breakId}`);
  return { ok: true };
}

// ============================================================
// UNASSIGN SPOT (clear customer + price)
// ============================================================
export async function unassignSpot(
  spotId: string,
  breakId: string
): Promise<ActionResult> {
  const { supabase } = await requireOrgId();

  const { error } = await supabase
    .from("break_spots")
    .update({
      customer_id: null,
      price: null,
      payment_received: false,
      shipped: false,
      shipped_at: null,
      tracking_number: null,
    })
    .eq("id", spotId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/breaks/${breakId}`);
  return { ok: true };
}

// ============================================================
// BULK ACTIONS (mark all paid, mark all shipped)
// ============================================================
export async function markAllPaid(breakId: string): Promise<ActionResult> {
  const { supabase } = await requireOrgId();

  const { error } = await supabase
    .from("break_spots")
    .update({ payment_received: true })
    .eq("break_id", breakId)
    .not("customer_id", "is", null);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/breaks/${breakId}`);
  return { ok: true };
}

export async function markAllShipped(breakId: string): Promise<ActionResult> {
  const { supabase } = await requireOrgId();

  const { error } = await supabase
    .from("break_spots")
    .update({ shipped: true, shipped_at: new Date().toISOString() })
    .eq("break_id", breakId)
    .not("customer_id", "is", null);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/breaks/${breakId}`);
  return { ok: true };
}

// ============================================================
// UPDATE BREAK STATUS
// ============================================================
export async function updateBreakStatus(
  breakId: string,
  status: "planned" | "in_progress" | "completed" | "canceled"
): Promise<ActionResult> {
  const { supabase } = await requireOrgId();

  const { error } = await supabase
    .from("breaks")
    .update({ status })
    .eq("id", breakId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/breaks/${breakId}`);
  revalidatePath("/breaks");
  return { ok: true };
}

// ============================================================
// ADD SPOT to an existing break
// ============================================================
export async function addSpotToBreak(
  breakId: string,
  teamIds: string[] = []
): Promise<ActionResult> {
  const { supabase } = await requireOrgId();

  // Get the current max spot number for this break
  const { data: existing } = await supabase
    .from("break_spots")
    .select("spot_number")
    .eq("break_id", breakId)
    .order("spot_number", { ascending: false })
    .limit(1);

  const nextNumber =
    existing && existing.length > 0
      ? (existing[0] as { spot_number: number }).spot_number + 1
      : 1;

  const { data: newSpot, error: insertError } = await supabase
    .from("break_spots")
    .insert({
      break_id: breakId,
      spot_number: nextNumber,
    })
    .select("id")
    .single();

  if (insertError || !newSpot) {
    return { ok: false, message: insertError?.message || "Failed to add spot" };
  }

  if (teamIds.length > 0) {
    const rows = teamIds.map((teamId) => ({
      break_spot_id: newSpot.id,
      team_id: teamId,
    }));
    const { error: teamsError } = await supabase
      .from("break_spot_teams")
      .insert(rows);
    if (teamsError) {
      return { ok: false, message: `Team assignment failed: ${teamsError.message}` };
    }
  }

  revalidatePath(`/breaks/${breakId}`);
  return { ok: true };
}

// ============================================================
// REMOVE SPOT (only if unsold)
// ============================================================
export async function removeSpotFromBreak(
  spotId: string,
  breakId: string
): Promise<ActionResult> {
  const { supabase } = await requireOrgId();

  // Sanity check: only allow removal if the spot is unsold
  const { data: spot } = await supabase
    .from("break_spots")
    .select("customer_id")
    .eq("id", spotId)
    .maybeSingle<{ customer_id: string | null }>();

  if (!spot) {
    return { ok: false, message: "Spot not found" };
  }
  if (spot.customer_id) {
    return {
      ok: false,
      message: "Can't delete a sold spot. Clear the customer first.",
    };
  }

  const { error } = await supabase
    .from("break_spots")
    .delete()
    .eq("id", spotId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/breaks/${breakId}`);
  return { ok: true };
}

// ============================================================
// QUICK CUSTOMER CREATE
// Used when assigning a spot to someone who doesn't exist yet.
// Returns the new customer's id so the caller can immediately use it.
// ============================================================
const quickCustomerSchema = z.object({
  display_name: z.string().trim().min(1).max(200),
  platform: z
    .enum([
      "whatnot",
      "fanatics_live",
      "discord",
      "ebay",
      "instagram",
      "twitter",
      "other",
    ])
    .optional(),
  username: z.string().trim().max(200).optional(),
});

export async function createCustomerQuick(values: {
  display_name: string;
  platform?: string;
  username?: string;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const parsed = quickCustomerSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: "Invalid input" };
  }

  const { supabase, orgId } = await requireOrgId();

  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      org_id: orgId,
      display_name: parsed.data.display_name,
    })
    .select("id")
    .single();

  if (error || !customer) {
    return { ok: false, message: error?.message || "Failed to create" };
  }

  // If a platform username was included, add it
  if (parsed.data.platform && parsed.data.username) {
    await supabase.from("customer_usernames").insert({
      customer_id: customer.id,
      platform: parsed.data.platform,
      username: parsed.data.username,
      is_primary: true,
    });
  }

  revalidatePath("/customers");
  return { ok: true, id: customer.id };
}
