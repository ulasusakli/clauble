"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { revalidatePath } from "next/cache";

import { LOCAL_APP_ORIGIN, RECOVERY_COOKIE } from "@/lib/auth/config";
import { getPostAuthDestination, resolveAccountState } from "@/lib/auth/account-state";
import { sanitizeRedirectPath } from "@/lib/auth/redirects";
import type { AuthActionState } from "@/lib/auth/types";
import {
  forgotPasswordSchema,
  formValue,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  toFieldErrors,
} from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

const GENERIC_AUTH_ERROR = "We couldn't complete that request. Please try again.";

export async function signupAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
    confirmPassword: formValue(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${LOCAL_APP_ORIGIN}/auth/confirm` },
  });

  if (error) {
    return { status: "error", message: GENERIC_AUTH_ERROR };
  }

  redirect("/auth/check-email");
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return { status: "error", message: "Email or password is incorrect." };
  }

  let destination: Route;
  try {
    const state = await resolveAccountState(supabase, data.user.id);
    destination = getPostAuthDestination(state, sanitizeRedirectPath(formValue(formData, "next")));
  } catch {
    await supabase.auth.signOut({ scope: "local" });
    return { status: "error", message: GENERIC_AUTH_ERROR };
  }

  redirect(destination);
}

export async function forgotPasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formValue(formData, "email") });
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${LOCAL_APP_ORIGIN}/auth/confirm`,
  });

  return {
    status: "success",
    message: "If an account exists for this email, you'll receive password reset instructions.",
  };
}

export async function resetPasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formValue(formData, "password"),
    confirmPassword: formValue(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const cookieStore = await cookies();
  if (cookieStore.get(RECOVERY_COOKIE)?.value !== "1") {
    return { status: "error", message: "This recovery session is no longer valid." };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { status: "error", message: "This recovery session is no longer valid." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: GENERIC_AUTH_ERROR };

  await supabase.auth.signOut();
  cookieStore.delete(RECOVERY_COOKIE);
  revalidatePath("/", "layout");
  redirect("/login?status=password-updated");
}
