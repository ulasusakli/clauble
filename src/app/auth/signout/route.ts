import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { RECOVERY_COOKIE } from "@/lib/auth/config";
import { createRouteClient } from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if ((origin && origin !== request.nextUrl.origin) || (fetchSite && fetchSite !== "same-origin")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { supabase, withSessionCookies } = createRouteClient(request);
  const { error } = await supabase.auth.getUser();
  await supabase.auth.signOut({ scope: error ? "local" : "global" });
  revalidatePath("/", "layout");

  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.delete(RECOVERY_COOKIE);
  return withSessionCookies(response);
}
