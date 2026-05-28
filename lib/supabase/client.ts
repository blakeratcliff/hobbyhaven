import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in Client Components.
 * This is safe to use in the browser - it only uses the anon key.
 *
 * Note: We intentionally don't pass the `<Database>` generic here.
 * Until we generate types via the Supabase CLI, our hand-written Database
 * type doesn't fully cooperate with the client's deep type inference.
 * Individual queries use explicit `.select<...>()` / `.maybeSingle<...>()`
 * types where needed.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
