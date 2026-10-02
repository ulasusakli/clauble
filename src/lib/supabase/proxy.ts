import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import { RECOVERY_COOKIE } from "@/lib/auth/config";
import { sanitizeRedirectPath } from "@/lib/auth/redirects";
import { getClientEnvironment } from "@/lib/env/client";
import type { Database } from "@/types/database.generated";

const AUTH_REQUIRED_PATHS = ["/onboarding/profile"];

export async function updateSession(request: NextRequest) {
  const environment = getClientEnvironment();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          for (const cookie of cookiesToSet) {
            request.cookies.set(cookie.name, cookie.value);
          }

          const nextResponse = NextResponse.next({ request });
          for (const cookie of cookiesToSet) {
            nextResponse.cookies.set(cookie.name, cookie.value, cookie.options);
          }
          for (const [name, value] of Object.entries(headers)) {
            nextResponse.headers.set(name, value);
          }
          response = nextResponse;
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = !error && Boolean(data?.claims?.sub);
  const pathname = request.nextUrl.pathname;

  if (isAuthenticated) {
    response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  }

  if (AUTH_REQUIRED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    if (!isAuthenticated) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", sanitizeRedirectPath(`${pathname}${request.nextUrl.search}`));
      return NextResponse.redirect(login);
    }
  }

  if (pathname === "/reset-password") {
    if (!isAuthenticated || request.cookies.get(RECOVERY_COOKIE)?.value !== "1") {
      return NextResponse.redirect(new URL("/forgot-password", request.url));
    }
  }

  return response;
}
