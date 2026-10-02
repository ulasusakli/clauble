import type { Route } from "next";

const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

export function sanitizeRedirectPath(
  value: string | null | undefined,
  fallback: Route = "/",
): Route {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  if (value.includes("\\") || CONTROL_CHARACTER.test(value)) {
    return fallback;
  }

  try {
    const base = new URL("https://clauble.invalid");
    const resolved = new URL(value, base);

    if (resolved.origin !== base.origin || !resolved.pathname.startsWith("/")) {
      return fallback;
    }

    return `${resolved.pathname}${resolved.search}${resolved.hash}` as Route;
  } catch {
    return fallback;
  }
}
