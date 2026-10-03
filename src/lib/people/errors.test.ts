import { describe, expect, it } from "vitest";

import { mapProfileInsertError, mapProfileUpdateError } from "./errors";

describe("profile insert error mapping", () => {
  it("maps uniqueness conflicts to a safe username error", () => {
    expect(mapProfileInsertError({ code: "23505" })).toEqual({
      status: "error",
      message: "This username is unavailable.",
      fieldErrors: { username: "This username is unavailable." },
    });
  });

  it("never exposes unknown database error details", () => {
    expect(mapProfileInsertError({ code: "XX000" })).toEqual({
      status: "error",
      message: "We couldn't create your profile. Please try again.",
    });
  });
});

describe("profile update error mapping", () => {
  it("maps username conflicts without exposing database details", () => {
    expect(mapProfileUpdateError({ code: "23505" })).toEqual({
      status: "error",
      message: "This username is unavailable.",
      fieldErrors: { username: "This username is unavailable." },
    });
    expect(mapProfileUpdateError({ code: "XX000" })).toEqual({
      status: "error",
      message: "We couldn't save your profile. Please try again.",
    });
  });
});
