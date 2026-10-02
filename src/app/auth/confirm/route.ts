import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { getPostAuthDestination, resolveAccountState } from "@/lib/auth/account-state";
import { RECOVERY_COOKIE } from "@/lib/auth/config";
import { sanitizeRedirectPath } from "@/lib/auth/redirects";
import { createRouteClient } from "@/lib/supabase/route";

const CONFIRMATION_TYPES = new Set<EmailOtpType>(["signup", "recovery"]);

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const rawType = request.nextUrl.searchParams.get("type");

  if (!tokenHash || !rawType || !CONFIRMATION_TYPES.has(rawType as EmailOtpType)) {
    return NextResponse.redirect(new URL("/auth/error", request.url));
  }

  const type = rawType as "signup" | "recovery";
  const { supabase, withSessionCookies } = createRouteClient(request);
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error || !data.user) {
    return withSessionCookies(NextResponse.redirect(new URL("/auth/error", request.url)));
  }

  let destination: string;
  if (type === "recovery") {
    destination = sanitizeRedirectPath(request.nextUrl.searchParams.get("next"), "/reset-password");
  } else {
    try {
      const state = await resolveAccountState(supabase, data.user.id);
      destination = getPostAuthDestination(state);
    } catch {
      return withSessionCookies(NextResponse.redirect(new URL("/auth/error", request.url)));
    }
  }

  const response = NextResponse.redirect(new URL(destination, request.url));
  if (type === "recovery") {
    response.cookies.set(RECOVERY_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 15 * 60,
    });
  }
  return withSessionCookies(response);
}
