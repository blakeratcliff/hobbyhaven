import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/auth/callback"];
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";
  const pathname = url.pathname;

  // ============================================================
  // 1) Detect subdomain (for breaker-specific public pages later)
  // ============================================================
  // Strip port for local dev comparison
  const rootDomainBase = ROOT_DOMAIN.split(":")[0];
  const hostnameBase = hostname.split(":")[0];

  // Subdomain is anything before the root domain, EXCEPT "www" or "app"
  let subdomain: string | null = null;

  if (hostnameBase.endsWith(rootDomainBase) && hostnameBase !== rootDomainBase) {
    const prefix = hostnameBase
      .slice(0, hostnameBase.length - rootDomainBase.length)
      .replace(/\.$/, "");

    if (prefix && prefix !== "www" && prefix !== "app") {
      subdomain = prefix;
    }
  }

  // Pass subdomain to downstream pages via header (read in server components)
  if (subdomain) {
    supabaseResponse.headers.set("x-breaker-slug", subdomain);
  }

  // ============================================================
  // 2) Auth gate for protected routes
  // ============================================================
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    route === "/" ? pathname === "/" : pathname.startsWith(route)
  );
  const isOnboarding = pathname.startsWith("/onboarding");

  // Not signed in + trying to access protected route → redirect to login
  if (!user && !isPublicRoute && !isOnboarding) {
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Signed in + on a login/signup page → redirect to dashboard
  if (
    user &&
    (pathname === "/login" || pathname === "/signup")
  ) {
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml
     * - any file with an extension (.svg, .png, .jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
