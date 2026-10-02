import "server-only";

import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import { getClientEnvironment } from "@/lib/env/client";
import type { Database } from "@/types/database.generated";

export function createRouteClient(request: NextRequest) {
  const environment = getClientEnvironment();
  const pendingCookies: Array<{
    name: string;
    value: string;
    options: Parameters<NextResponse["cookies"]["set"]>[2];
  }> = [];
  const pendingHeaders = new Headers();

  const supabase = createServerClient<Database>(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          for (const cookie of cookiesToSet) {
            request.cookies.set(cookie.name, cookie.value);
            pendingCookies.push(cookie);
          }
          for (const [name, value] of Object.entries(headers)) {
            pendingHeaders.set(name, value);
          }
        },
      },
    },
  );

  function withSessionCookies(target: NextResponse) {
    for (const cookie of pendingCookies) {
      target.cookies.set(cookie.name, cookie.value, cookie.options);
    }
    pendingHeaders.forEach((value, name) => target.headers.set(name, value));
    return target;
  }

  return { supabase, withSessionCookies };
}
