import { describe, expect, it } from "vitest";

import { sanitizeRedirectPath } from "./redirects";

describe("sanitizeRedirectPath", () => {
  it.each([
    ["/workspace", "/workspace"],
    ["/settings?tab=security#password", "/settings?tab=security#password"],
    ["https://attacker.example", "/"],
    ["//attacker.example/path", "/"],
    ["javascript:alert(1)", "/"],
    ["/\\attacker.example", "/"],
    ["/%0aevil", "/%0aevil"],
    [null, "/"],
  ])("maps %s to %s", (input, expected) => {
    expect(sanitizeRedirectPath(input)).toBe(expected);
  });

  it("uses the supplied internal fallback", () => {
    expect(sanitizeRedirectPath("//outside.example", "/login")).toBe("/login");
  });
});
