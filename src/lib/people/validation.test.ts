import { describe, expect, it } from "vitest";

import { profileCompletionSchema, profileEditSchema } from "./validation";

describe("profile completion validation", () => {
  it("normalizes valid input and converts blank optional fields to null", () => {
    expect(
      profileCompletionSchema.parse({
        username: " Ulas_1 ",
        displayName: "  Ulas Usakli  ",
        headline: " ",
        website: " ",
      }),
    ).toEqual({
      username: "ulas_1",
      displayName: "Ulas Usakli",
      headline: null,
      website: null,
    });
  });

  it("does not silently remove unsupported username characters", () => {
    expect(
      profileCompletionSchema.safeParse({
        username: "ulas-test",
        displayName: "Ulas",
        headline: "",
        website: "",
      }).success,
    ).toBe(false);
  });

  it("rejects reserved usernames", () => {
    const result = profileCompletionSchema.safeParse({
      username: "admin",
      displayName: "Admin",
      headline: "",
      website: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe("This username is unavailable.");
  });

  it.each(["javascript:alert(1)", "ftp://example.com", "example.com"])(
    "rejects unsafe or incomplete website %s",
    (website) => {
      expect(
        profileCompletionSchema.safeParse({
          username: "safe_user",
          displayName: "Safe User",
          headline: "",
          website,
        }).success,
      ).toBe(false);
    },
  );
});

describe("profile editing validation", () => {
  it("normalizes all editable fields and accepts the concurrency version", () => {
    expect(
      profileEditSchema.parse({
        username: " New_Name ",
        displayName: " New Name ",
        headline: " Building ",
        bio: " About me ",
        website: " https://example.com/me ",
        version: "2026-10-02T20:00:00.000Z",
      }),
    ).toEqual({
      username: "new_name",
      displayName: "New Name",
      headline: "Building",
      bio: "About me",
      website: "https://example.com/me",
      version: "2026-10-02T20:00:00.000Z",
    });
  });

  it("rejects an overlong bio and missing concurrency version", () => {
    expect(
      profileEditSchema.safeParse({
        username: "safe_user",
        displayName: "Safe User",
        headline: "",
        bio: "b".repeat(501),
        website: "",
        version: "",
      }).success,
    ).toBe(false);
  });
});
