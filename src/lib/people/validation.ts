import { z } from "zod";

import { isReservedUsername, normalizeUsername, USERNAME_PATTERN } from "./usernames";

const username = z
  .string()
  .max(100, "Username is too long.")
  .transform(normalizeUsername)
  .pipe(
    z
      .string()
      .regex(USERNAME_PATTERN, "Use 3–30 lowercase letters, numbers, or underscores.")
      .refine((value) => !isReservedUsername(value), "This username is unavailable."),
  );

const optionalText = (maximum: number, message: string) =>
  z
    .string()
    .max(maximum, message)
    .transform((value) => value.trim() || null);

const website = z
  .string()
  .max(2048, "Website URL is too long.")
  .transform((value) => value.trim())
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Enter a complete http:// or https:// URL.")
  .transform((value) => value || null);

export const profileCompletionSchema = z.object({
  username,
  displayName: z
    .string()
    .trim()
    .min(1, "Enter your display name.")
    .max(80, "Display name must be 80 characters or fewer."),
  headline: optionalText(120, "Headline must be 120 characters or fewer."),
  website,
});

export const profileEditSchema = profileCompletionSchema.extend({
  bio: optionalText(500, "Bio must be 500 characters or fewer."),
  version: z.string().trim().min(1, "Refresh the page and try again."),
});

export type ProfileCompletionInput = z.infer<typeof profileCompletionSchema>;
export type ProfileEditInput = z.infer<typeof profileEditSchema>;

export function formValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function toProfileFieldErrors(error: z.ZodError): ProfileFieldErrors {
  const fields: ProfileFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in fields)) {
      fields[field as keyof ProfileFieldErrors] = issue.message;
    }
  }

  return fields;
}

export type ProfileFieldErrors = Partial<
  Record<"username" | "displayName" | "headline" | "bio" | "website", string>
>;
