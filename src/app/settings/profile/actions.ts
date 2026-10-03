"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { resolveAccountState } from "@/lib/auth/account-state";
import {
  AVATAR_BUCKET,
  createAvatarPath,
  isOwnedAvatarPath,
  validateAvatarFile,
} from "@/lib/people/avatar";
import { mapProfileUpdateError } from "@/lib/people/errors";
import type { AvatarActionState, ProfileEditActionState } from "@/lib/people/types";
import { formValue, profileEditSchema, toProfileFieldErrors } from "@/lib/people/validation";
import { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;
type EditablePerson = {
  avatar_path: string | null;
  status: "active" | "suspended" | "deactivated" | "deleted";
  updated_at: string;
  username: string;
};

function publicProfileRoute(username: string): Route {
  return `/u/${encodeURIComponent(username)}` as Route;
}

async function requireActivePerson(
  supabase: ServerClient,
  loginNext = "/settings/profile",
): Promise<{ userId: string; person: EditablePerson }> {
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsError ? null : claimsData?.claims?.sub;
  if (!userId) redirect(`/login?next=${encodeURIComponent(loginNext)}` as Route);

  let accountState: Awaited<ReturnType<typeof resolveAccountState>>;
  try {
    accountState = await resolveAccountState(supabase, userId);
  } catch {
    throw new Error("Unable to resolve account state.");
  }
  if (accountState.kind === "profile_required") redirect("/onboarding/profile");
  if (accountState.kind === "restricted") redirect("/account/restricted");
  if (accountState.kind !== "active") redirect("/login");

  const { data, error } = await supabase
    .from("people")
    .select("username, avatar_path, status, updated_at")
    .eq("id", userId)
    .single();

  if (error || !data) throw new Error("Unable to load the editable profile.", { cause: error });
  if (data.status !== "active") redirect("/account/restricted");
  return { userId, person: data };
}

function revalidateProfilePaths(previousUsername: string, nextUsername: string): void {
  revalidatePath("/");
  revalidatePath("/settings/profile");
  revalidatePath(publicProfileRoute(previousUsername));
  if (previousUsername !== nextUsername) revalidatePath(publicProfileRoute(nextUsername));
}

async function cleanupUnusedAvatars(
  supabase: ServerClient,
  userId: string,
  keepPath: string | null,
): Promise<boolean> {
  const bucket = supabase.storage.from(AVATAR_BUCKET);

  for (let page = 0; page < 10; page += 1) {
    const { data, error } = await bucket.list(userId, {
      limit: 100,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) return false;

    const stalePaths = data
      .map((object) => `${userId}/${object.name}`)
      .filter((path) => path !== keepPath && isOwnedAvatarPath(path, userId));
    if (stalePaths.length === 0) return data.length < 100;

    const { error: removeError } = await bucket.remove(stalePaths);
    if (removeError) return false;
  }

  return false;
}

export async function updateProfileAction(
  _previousState: ProfileEditActionState,
  formData: FormData,
): Promise<ProfileEditActionState> {
  const parsed = profileEditSchema.safeParse({
    username: formValue(formData, "username"),
    displayName: formValue(formData, "displayName"),
    headline: formValue(formData, "headline"),
    bio: formValue(formData, "bio"),
    website: formValue(formData, "website"),
    version: formValue(formData, "version"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted profile details.",
      fieldErrors: toProfileFieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const context = await requireActivePerson(supabase);

  if (context.person.updated_at !== parsed.data.version) {
    return {
      status: "conflict",
      message: "This profile changed in another request. Refresh the page before saving again.",
    };
  }

  const { data, error } = await supabase
    .from("people")
    .update({
      username: parsed.data.username,
      display_name: parsed.data.displayName,
      headline: parsed.data.headline,
      bio: parsed.data.bio,
      website_url: parsed.data.website,
    })
    .eq("id", context.userId)
    .eq("status", "active")
    .eq("updated_at", parsed.data.version)
    .select("username, updated_at")
    .maybeSingle();

  if (error) return mapProfileUpdateError(error);
  if (!data) {
    return {
      status: "conflict",
      message: "This profile changed in another request. Refresh the page before saving again.",
    };
  }

  revalidateProfilePaths(context.person.username, data.username);
  redirect("/settings/profile?updated=profile");
}

export async function uploadAvatarAction(
  _previousState: AvatarActionState,
  formData: FormData,
): Promise<AvatarActionState> {
  const version = formValue(formData, "version");
  const validatedFile = await validateAvatarFile(formData.get("avatar"));
  if (!validatedFile.success) return { status: "error", message: validatedFile.message };

  const supabase = await createClient();
  const context = await requireActivePerson(supabase);

  if (!version || context.person.updated_at !== version) {
    return {
      status: "conflict",
      message: "This profile changed in another request. Refresh the page before uploading again.",
    };
  }

  const path = createAvatarPath(context.userId, randomUUID(), validatedFile.extension);
  const bucket = supabase.storage.from(AVATAR_BUCKET);
  const { error: uploadError } = await bucket.upload(path, validatedFile.bytes, {
    cacheControl: "31536000",
    contentType: validatedFile.contentType,
    upsert: false,
  });
  if (uploadError) {
    return { status: "error", message: "We couldn't upload your avatar. Please try again." };
  }

  const { data, error: updateError } = await supabase
    .from("people")
    .update({ avatar_path: path })
    .eq("id", context.userId)
    .eq("status", "active")
    .eq("updated_at", version)
    .select("username, updated_at")
    .maybeSingle();

  if (updateError || !data) {
    await bucket.remove([path]);
    return updateError
      ? { status: "error", message: "We couldn't save your avatar. Please try again." }
      : {
          status: "conflict",
          message: "This profile changed in another request. Refresh the page before uploading again.",
        };
  }

  const cleanupComplete = await cleanupUnusedAvatars(supabase, context.userId, path);
  revalidateProfilePaths(data.username, data.username);
  redirect(
    cleanupComplete
      ? "/settings/profile?updated=avatar"
      : "/settings/profile?updated=avatar&cleanup=pending",
  );
}

export async function deleteAvatarAction(
  _previousState: AvatarActionState,
  formData: FormData,
): Promise<AvatarActionState> {
  const version = formValue(formData, "version");
  const supabase = await createClient();
  const context = await requireActivePerson(supabase);

  if (!version || context.person.updated_at !== version) {
    return {
      status: "conflict",
      message: "This profile changed in another request. Refresh the page before removing again.",
    };
  }

  if (context.person.avatar_path) {
    const { data, error } = await supabase
      .from("people")
      .update({ avatar_path: null })
      .eq("id", context.userId)
      .eq("status", "active")
      .eq("updated_at", version)
      .select("username, updated_at")
      .maybeSingle();

    if (error) {
      return { status: "error", message: "We couldn't remove your avatar. Please try again." };
    }
    if (!data) {
      return {
        status: "conflict",
        message: "This profile changed in another request. Refresh the page before removing again.",
      };
    }
  }

  const cleanupComplete = await cleanupUnusedAvatars(supabase, context.userId, null);
  revalidateProfilePaths(context.person.username, context.person.username);
  redirect(
    cleanupComplete
      ? "/settings/profile?updated=avatar-removed"
      : "/settings/profile?updated=avatar-removed&cleanup=pending",
  );
}
