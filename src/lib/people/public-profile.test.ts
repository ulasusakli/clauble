import { describe, expect, it } from "vitest";

import { getProfileInitials, getSafePublicWebsite } from "./public-profile";

describe("public profile presentation", () => {
  it("allows only absolute HTTP(S) website URLs", () => {
    expect(getSafePublicWebsite("https://example.com/path")).toBe("https://example.com/path");
    expect(getSafePublicWebsite("javascript:alert(1)")).toBeNull();
    expect(getSafePublicWebsite("/relative")).toBeNull();
  });

  it("derives a deterministic two-part placeholder", () => {
    expect(getProfileInitials("Ada Lovelace", "ada")).toBe("AL");
    expect(getProfileInitials("", "ada")).toBe("AD");
  });
});
