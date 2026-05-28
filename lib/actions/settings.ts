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
    .select("org_id, role")
    .eq("id", user.id)
    .maybeSingle<{ org_id: string; role: string }>();

  if (!profile) throw new Error("No organization found");
  return { supabase, orgId: profile.org_id, userId: user.id, role: profile.role };
}

// ============================================================
// UPDATE ORG (name + slug)
// ============================================================
const orgUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(50)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens"
    ),
});

export async function updateOrganization(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = orgUpdateSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { supabase, orgId, role } = await requireOrgId();

  if (role !== "owner" && role !== "admin") {
    return { ok: false, message: "Only owners and admins can update the org." };
  }

  // Check slug uniqueness (excluding self)
  const { data: existing } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", parsed.data.slug)
    .neq("id", orgId)
    .maybeSingle<{ id: string }>();

  if (existing) {
    return {
      ok: false,
      message: "That slug is already taken by another organization.",
      fieldErrors: { slug: ["Slug is already in use"] },
    };
  }

  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
    })
    .eq("id", orgId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true, message: "Saved." };
}

// ============================================================
// UPDATE PROFILE (display name)
// ============================================================
const profileUpdateSchema = z.object({
  display_name: z.string().trim().min(1, "Name is required").max(200),
});

export async function updateProfile(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = profileUpdateSchema.safeParse({
    display_name: formData.get("display_name"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { supabase, userId } = await requireOrgId();

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
    })
    .eq("id", userId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true, message: "Saved." };
}
