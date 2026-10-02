import type { SupabaseClient } from "@supabase/supabase-js";
import type { Route } from "next";

import type { Database } from "@/types/database.generated";

import { sanitizeRedirectPath } from "./redirects";
import type { AccountState, PersonStatus } from "./types";

type PersonIdentity = { status: PersonStatus; username: string } | null;

export function mapAccountState(userId: string | null, person: PersonIdentity): AccountState {
  if (!userId) return { kind: "anonymous" };
  if (!person) return { kind: "profile_required", userId };
  if (person.status === "active") {
    return { kind: "active", userId, username: person.username };
  }

  return { kind: "restricted", userId, personStatus: person.status };
}

export function getPostAuthDestination(state: AccountState, requestedPath?: string | null): Route {
  switch (state.kind) {
    case "anonymous":
      return "/login";
    case "profile_required":
      return "/onboarding/profile";
    case "restricted":
      return "/account/restricted";
    case "active":
      return sanitizeRedirectPath(requestedPath, "/");
  }
}

export async function resolveAccountState(
  supabase: SupabaseClient<Database>,
  userId: string | null,
): Promise<AccountState> {
  if (!userId) return { kind: "anonymous" };

  const { data, error } = await supabase
    .from("people")
    .select("status, username")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to resolve account state.", { cause: error });
  }

  return mapAccountState(userId, data);
}
