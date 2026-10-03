import { describe, expect, it } from "vitest";

import {
  getPostAuthDestination,
  getProfileOnboardingDestination,
  mapAccountState,
} from "./account-state";

describe("account state", () => {
  it("maps missing and active people separately", () => {
    expect(mapAccountState("user-1", null)).toEqual({ kind: "profile_required", userId: "user-1" });
    expect(mapAccountState("user-1", { status: "active", username: "ada" })).toEqual({ kind: "active", userId: "user-1", username: "ada" });
  });

  it.each(["suspended", "deactivated", "deleted"] as const)("maps %s to restricted", (status) => {
    expect(mapAccountState("user-1", { status, username: "ada" })).toEqual({ kind: "restricted", userId: "user-1", personStatus: status });
  });

  it("does not treat an authenticated user without a Person as active", () => {
    expect(getPostAuthDestination(mapAccountState("user-1", null))).toBe("/onboarding/profile");
  });

  it("sanitizes the active user's requested destination", () => {
    const state = mapAccountState("user-1", { status: "active", username: "ada" });
    expect(getPostAuthDestination(state, "//attacker.example")).toBe("/");
  });

  it("routes each account state correctly from profile onboarding", () => {
    expect(getProfileOnboardingDestination(mapAccountState(null, null))).toBe(
      "/login?next=/onboarding/profile",
    );
    expect(getProfileOnboardingDestination(mapAccountState("user-1", null))).toBeNull();
    expect(
      getProfileOnboardingDestination(
        mapAccountState("user-1", { status: "active", username: "ada" }),
      ),
    ).toBe("/u/ada");
    expect(
      getProfileOnboardingDestination(
        mapAccountState("user-1", { status: "suspended", username: "ada" }),
      ),
    ).toBe("/account/restricted");
  });
});
