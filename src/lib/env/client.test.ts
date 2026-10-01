import { describe, expect, it } from "vitest";

import { parseClientEnvironment } from "./client";

describe("parseClientEnvironment", () => {
  it("accepts a Supabase URL and publishable key", () => {
    expect(
      parseClientEnvironment({
        supabaseUrl: "https://example.supabase.co",
        supabasePublishableKey: "sb_publishable_test",
      }),
    ).toEqual({
      supabaseUrl: "https://example.supabase.co",
      supabasePublishableKey: "sb_publishable_test",
    });
  });

  it("rejects missing public configuration without echoing values", () => {
    expect(() => parseClientEnvironment({})).toThrow(
      "Invalid public environment configuration: supabaseUrl, supabasePublishableKey",
    );
  });
});

