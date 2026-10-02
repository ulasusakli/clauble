import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type CookieWrite = {
  name: string;
  value: string;
  options: { httpOnly?: boolean; path?: string };
};

type ServerClientOptions = {
  cookies: {
    setAll: (cookies: CookieWrite[], headers: Record<string, string>) => void;
  };
};

const authState = vi.hoisted(() => ({ userId: "user-1" as string | null }));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: ServerClientOptions) => ({
    auth: {
      getClaims: async () => {
        if (!authState.userId) return { data: null, error: new Error("Missing session") };

        options.cookies.setAll(
          [
            {
              name: "sb-test-auth-token",
              value: "refreshed",
              options: { httpOnly: true, path: "/" },
            },
          ],
          {
            "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
            Expires: "0",
            Pragma: "no-cache",
          },
        );
        return { data: { claims: { sub: authState.userId } }, error: null };
      },
    },
  }),
}));

import { updateSession } from "./proxy";

describe("Supabase Proxy session refresh", () => {
  beforeEach(() => {
    authState.userId = "user-1";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:55321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  });

  it("propagates refreshed cookies and cache-prevention headers", async () => {
    const response = await updateSession(new NextRequest("http://localhost:3000/"));

    expect(response.cookies.get("sb-test-auth-token")?.value).toBe("refreshed");
    expect(response.headers.get("cache-control")).toContain("private");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });

  it("redirects anonymous protected access and preserves only an internal next path", async () => {
    authState.userId = null;
    const response = await updateSession(
      new NextRequest("http://localhost:3000/onboarding/profile"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fonboarding%2Fprofile",
    );
  });
});
