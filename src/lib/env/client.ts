import { z } from "zod";

const clientEnvironmentSchema = z.object({
  supabaseUrl: z.url().refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "must use http or https"),
  supabasePublishableKey: z.string().trim().min(1),
});

export type ClientEnvironment = z.infer<typeof clientEnvironmentSchema>;

export function parseClientEnvironment(input: unknown): ClientEnvironment {
  const result = clientEnvironmentSchema.safeParse(input);

  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => issue.path.join("."))
      .filter(Boolean)
      .join(", ");

    throw new Error(`Invalid public environment configuration: ${fields || "unknown field"}`);
  }

  return result.data;
}

export function getClientEnvironment(): ClientEnvironment {
  return parseClientEnvironment({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

