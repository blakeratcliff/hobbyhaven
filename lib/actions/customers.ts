"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ============================================================
// Validation schemas
// ============================================================
const usernameSchema = z.object({
  platform: z.enum([
    "whatnot",
    "fanatics_live",
    "discord",
    "ebay",
    "instagram",
    "twitter",
    "other",
  ]),
  username: z.string().trim().min(1, "Username can't be empty"),
});

const customerSchema = z.object({
  display_name: z.string().trim().min(1, "Name is required").max(200),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  usernames: z.array(usernameSchema).default([]),
});

// ============================================================
// Action result type
// ============================================================
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
// CREATE
// ============================================================
export async function createCustomer(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  // Parse the form data, including the dynamic usernames array
  const usernames: { platform: string; username: string }[] = [];
  for (const [key, value] of formData.entries()) {
    const platformMatch = key.match(/^username_platform_(\d+)$/);
    if (platformMatch) {
      const idx = platformMatch[1];
      const username = formData.get(`username_value_${idx}`);
      if (typeof value === "string" && typeof username === "string" && username.trim()) {
        usernames.push({ platform: value, username: username.trim() });
      }
    }
  }

  const parsed = customerSchema.safeParse({
    display_name: formData.get("display_name"),
    notes: formData.get("notes") || "",
    usernames,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const { supabase, orgId } = await requireOrgId();

  // Insert the customer
  const { data: customer, error: insertError } = await supabase
    .from("customers")
    .insert({
      org_id: orgId,
      display_name: parsed.data.display_name,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (insertError || !customer) {
    return { ok: false, message: insertError?.message || "Failed to create" };
  }

  // Insert usernames if any
  if (parsed.data.usernames.length > 0) {
    const usernameRows = parsed.data.usernames.map((u, i) => ({
      customer_id: customer.id,
      platform: u.platform,
      username: u.username,
      is_primary: i === 0,
    }));
    const { error: usernameError } = await supabase
      .from("customer_usernames")
      .insert(usernameRows);

    if (usernameError) {
      // Customer was created but usernames failed. Surface the warning.
      revalidatePath("/customers");
      return {
        ok: false,
        message: `Customer created but usernames failed: ${usernameError.message}`,
      };
    }
  }

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

// ============================================================
// UPDATE
// ============================================================
export async function updateCustomer(
  customerId: string,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const usernames: { platform: string; username: string }[] = [];
  for (const [key, value] of formData.entries()) {
    const platformMatch = key.match(/^username_platform_(\d+)$/);
    if (platformMatch) {
      const idx = platformMatch[1];
      const username = formData.get(`username_value_${idx}`);
      if (typeof value === "string" && typeof username === "string" && username.trim()) {
        usernames.push({ platform: value, username: username.trim() });
      }
    }
  }

  const parsed = customerSchema.safeParse({
    display_name: formData.get("display_name"),
    notes: formData.get("notes") || "",
    usernames,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const { supabase } = await requireOrgId();

  const { error: updateError } = await supabase
    .from("customers")
    .update({
      display_name: parsed.data.display_name,
      notes: parsed.data.notes || null,
    })
    .eq("id", customerId);

  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  // Replace all usernames: delete existing, insert new ones.
  // Simpler than diffing and good enough for now.
  await supabase.from("customer_usernames").delete().eq("customer_id", customerId);

  if (parsed.data.usernames.length > 0) {
    const usernameRows = parsed.data.usernames.map((u, i) => ({
      customer_id: customerId,
      platform: u.platform,
      username: u.username,
      is_primary: i === 0,
    }));
    await supabase.from("customer_usernames").insert(usernameRows);
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

// ============================================================
// DELETE
// ============================================================
export async function deleteCustomer(customerId: string): Promise<ActionResult> {
  const { supabase } = await requireOrgId();

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/customers");
  redirect("/customers");
}
