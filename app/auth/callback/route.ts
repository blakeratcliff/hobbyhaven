import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase auth callback.
 * Handles email confirmation, magic links, and OAuth redirects.
 *
 * Currently unused (email confirmation is off for development) but kept
 * here so we don't have to plumb it in later when we re-enable it.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if the user has a profile; if not, send them to onboarding.
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", userData.user.id)
          .maybeSingle<{ id: string }>();

        if (!profile) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
