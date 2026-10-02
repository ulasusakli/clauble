import { describe, expect, it } from "vitest";

import { getPostAuthDestination, mapAccountState } from "./account-state";

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
});
