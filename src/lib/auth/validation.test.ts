import { describe, expect, it } from "vitest";

import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from "./validation";

describe("auth validation", () => {
  it("accepts project-compatible signup credentials", () => {
    expect(signupSchema.safeParse({ email: "person@example.test", password: "sixsix", confirmPassword: "sixsix" }).success).toBe(true);
  });

  it("rejects malformed email and mismatched passwords", () => {
    const result = signupSchema.safeParse({ email: "not-email", password: "abcdef", confirmPassword: "different" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((issue) => issue.path[0])).toEqual(expect.arrayContaining(["email", "confirmPassword"]));
  });

  it("rejects empty, short, and oversized payloads", () => {
    expect(loginSchema.safeParse({ email: "a@example.test", password: "" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: "short", confirmPassword: "short" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: `${"a".repeat(321)}@example.test` }).success).toBe(false);
  });
});
