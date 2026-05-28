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
