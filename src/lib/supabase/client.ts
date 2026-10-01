"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getClientEnvironment } from "@/lib/env/client";

let browserClient: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const environment = getClientEnvironment();
  browserClient = createBrowserClient(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
  );

  return browserClient;
}

