import { expect, test } from "@playwright/test";

test("renders accessible email/password auth forms", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveAttribute("autocomplete", "email");
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("autocomplete", "new-password");

  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter your email address.")).toBeVisible();
});

test("rejects malformed confirmation requests safely", async ({ request }) => {
  const missing = await request.get("/auth/confirm", { maxRedirects: 0 });
  expect(missing.status()).toBe(307);
  expect(missing.headers().location).toContain("/auth/error");

  const malformed = await request.get("/auth/confirm?token_hash=not-a-token&type=arbitrary", { maxRedirects: 0 });
  expect(malformed.status()).toBe(307);
  expect(malformed.headers().location).toContain("/auth/error");
});

test("anonymous access to profile onboarding redirects to login", async ({ request }) => {
  const response = await request.get("/onboarding/profile", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toContain("/login?next=%2Fonboarding%2Fprofile");
});

test("external next values never survive the login form", async ({ page }) => {
  await page.goto("/login?next=https://attacker.example/collect");
  await expect(page.locator('input[name="next"]')).toHaveValue("/");
});
