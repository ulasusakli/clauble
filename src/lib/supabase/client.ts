"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getClientEnvironment } from "@/lib/env/client";
import type { Database } from "@/types/database.generated";

let browserClient: SupabaseClient<Database> | undefined;

export function createClient(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient;
  }

  const environment = getClientEnvironment();
  browserClient = createBrowserClient<Database>(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
  );

  return browserClient;
}
