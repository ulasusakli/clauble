"use server";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";

import {
  getProfileOnboardingDestination,
  resolveAccountState,
} from "@/lib/auth/account-state";
import { mapProfileInsertError } from "@/lib/people/errors";
import type { ProfileCompletionActionState } from "@/lib/people/types";
import {
  formValue,
  profileCompletionSchema,
  toProfileFieldErrors,
} from "@/lib/people/validation";
import { createClient } from "@/lib/supabase/server";

function publicProfileRoute(username: string): Route {
  return `/u/${encodeURIComponent(username)}` as Route;
}

async function resolveRetryDestination(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<Route | null> {
  try {
    return getProfileOnboardingDestination(await resolveAccountState(supabase, userId));
  } catch {
    return null;
  }
}

export async function completeProfileAction(
  _previousState: ProfileCompletionActionState,
  formData: FormData,
): Promise<ProfileCompletionActionState> {
  const parsed = profileCompletionSchema.safeParse({
    username: formValue(formData, "username"),
    displayName: formValue(formData, "displayName"),
    headline: formValue(formData, "headline"),
    website: formValue(formData, "website"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted profile details.",
      fieldErrors: toProfileFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsError ? null : claimsData?.claims?.sub;
  if (!userId) redirect("/login?next=/onboarding/profile");

  let currentDestination: Route | null;
  try {
    currentDestination = getProfileOnboardingDestination(
      await resolveAccountState(supabase, userId),
    );
  } catch {
    return { status: "error", message: "We couldn't create your profile. Please try again." };
  }
  if (currentDestination) redirect(currentDestination);

  const { data, error } = await supabase
    .from("people")
    .insert({
      id: userId,
      username: parsed.data.username,
      display_name: parsed.data.displayName,
      headline: parsed.data.headline,
      website_url: parsed.data.website,
    })
    .select("username, status")
    .single();

  if (error) {
    const retryDestination = await resolveRetryDestination(supabase, userId);
    if (retryDestination && retryDestination !== "/login?next=/onboarding/profile") {
      redirect(retryDestination);
    }
    return mapProfileInsertError(error);
  }

  if (data.status !== "active") redirect("/account/restricted");

  revalidatePath("/");
  revalidatePath(publicProfileRoute(data.username));
  redirect(publicProfileRoute(data.username));
}
