export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

export const RESERVED_USERNAMES = new Set([
  "clauble",
  "admin",
  "administrator",
  "moderator",
  "support",
  "system",
  "security",
  "staff",
  "team",
  "official",
  "auth",
  "api",
  "account",
  "accounts",
  "settings",
  "login",
  "logout",
  "signup",
  "register",
  "onboarding",
  "notifications",
  "search",
  "people",
  "person",
  "companies",
  "company",
  "topics",
  "signals",
  "signal",
  "workspace",
  "billing",
  "plus",
  "www",
  "root",
  "null",
  "undefined",
  "me",
]);

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isUsernameFormatValid(value: string): boolean {
  return USERNAME_PATTERN.test(value);
}

export function isReservedUsername(value: string): boolean {
  return RESERVED_USERNAMES.has(value);
}

export function isAvailableUsernameCandidate(value: string): boolean {
  return isUsernameFormatValid(value) && !isReservedUsername(value);
}
