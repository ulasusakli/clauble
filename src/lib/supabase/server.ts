import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getClientEnvironment } from "@/lib/env/client";

export async function createClient() {
  const cookieStore = await cookies();
  const environment = getClientEnvironment();

  return createServerClient(environment.supabaseUrl, environment.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. A Route Handler or future
          // authenticated request boundary must perform session refreshes.
        }
      },
    },
  });
}

