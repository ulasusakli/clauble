import { describe, expect, it } from "vitest";

import {
  isAvailableUsernameCandidate,
  isReservedUsername,
  isUsernameFormatValid,
  normalizeUsername,
} from "./usernames";

describe("username rules", () => {
  it("normalizes outer whitespace and casing without removing internal characters", () => {
    expect(normalizeUsername(" Ulas_1 ")).toBe("ulas_1");
    expect(normalizeUsername(" Ulas-Test ")).toBe("ulas-test");
  });

  it.each(["ulas", "ulas_1", "hiyelx", "robotics_01", "startup123"])(
    "accepts the valid candidate %s",
    (username) => {
      expect(isAvailableUsernameCandidate(username)).toBe(true);
    },
  );

  it.each(["Ulas", "ul", "ulas-usakli", "ulas usakli", "@ulas", "a".repeat(31)])(
    "rejects the invalid format %s",
    (username) => {
      expect(isUsernameFormatValid(username)).toBe(false);
    },
  );

  it.each(["admin", "clauble", "support", "login", "signals", "workspace", "www"])(
    "reserves %s",
    (username) => {
      expect(isReservedUsername(username)).toBe(true);
      expect(isAvailableUsernameCandidate(username)).toBe(false);
    },
  );
});
