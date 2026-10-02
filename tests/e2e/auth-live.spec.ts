import { randomUUID } from "node:crypto";

import { expect, test, type APIRequestContext } from "@playwright/test";

const liveAuthEnabled = process.env.CLAUBLE_AUTH_LIVE === "1";
const mailpitUrl = "http://127.0.0.1:55324";

type MailpitAddress = { Address: string };
type MailpitMessage = { ID: string; Subject: string; To: MailpitAddress[] };

async function findMessage(
  request: APIRequestContext,
  email: string,
  subject: string,
): Promise<string | null> {
  const response = await request.get(`${mailpitUrl}/api/v1/messages?limit=100`);
  if (!response.ok()) return null;
  const body = (await response.json()) as { messages?: MailpitMessage[] };
  return (
    body.messages?.find(
      (message) =>
        message.Subject === subject && message.To.some((recipient) => recipient.Address === email),
    )?.ID ?? null
  );
}

async function confirmationLink(request: APIRequestContext, messageId: string): Promise<string> {
  const response = await request.get(`${mailpitUrl}/api/v1/message/${messageId}`);
  expect(response.ok()).toBe(true);
  const message = (await response.json()) as { HTML?: string };
  const match = message.HTML?.match(/href="([^"]+\/auth\/confirm[^"]*)"/);
  expect(match?.[1]).toBeTruthy();
  return match![1].replaceAll("&amp;", "&");
}

test.describe("local Supabase Auth and Mailpit", () => {
  test.skip(!liveAuthEnabled, "Set CLAUBLE_AUTH_LIVE=1 with the local Supabase stack running.");

  test("signup, confirmation, login, logout, recovery, and password replacement", async ({
    page,
    request,
  }) => {
    const unique = randomUUID();
    const email = `cycle-01a-${unique}@example.test`;
    const oldPassword = `Old-${randomUUID()}-7`;
    const newPassword = `New-${randomUUID()}-8`;

    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(oldPassword);
    await page.getByLabel("Confirm password").fill(oldPassword);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/auth\/check-email$/);

    let signupMessageId: string | null = null;
    await expect
      .poll(async () => {
        signupMessageId = await findMessage(request, email, "Confirm your Clauble account");
        return signupMessageId;
      })
      .not.toBeNull();

    const signupLink = await confirmationLink(request, signupMessageId!);
    const confirmationResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/auth/confirm?"),
    );
    await page.goto(signupLink);
    const confirmationResponse = await confirmationResponsePromise;
    expect((await confirmationResponse.allHeaders())["cache-control"]).toContain("private");
    await expect(page).toHaveURL(/\/onboarding\/profile$/);
    expect((await page.context().cookies()).some((cookie) => cookie.name.startsWith("sb-"))).toBe(true);

    const authenticatedResponse = await page.goto("/onboarding/profile");
    expect((await authenticatedResponse!.allHeaders())["cache-control"]).toContain("no-cache");

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(oldPassword);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/onboarding\/profile$/);

    await page.getByRole("button", { name: "Log out" }).click();
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send reset instructions" }).click();
    await expect(page.getByText(/If an account exists/)).toBeVisible();

    let recoveryMessageId: string | null = null;
    await expect
      .poll(async () => {
        recoveryMessageId = await findMessage(request, email, "Reset your Clauble password");
        return recoveryMessageId;
      })
      .not.toBeNull();

    const recoveryLink = await confirmationLink(request, recoveryMessageId!);
    await page.goto(recoveryLink);
    await expect(page).toHaveURL(/\/reset-password$/);
    await page.getByLabel("New password", { exact: true }).fill(newPassword);
    await page.getByLabel("Confirm password").fill(newPassword);
    await page.getByRole("button", { name: "Set new password" }).click();
    await expect(page).toHaveURL(/\/login\?status=password-updated$/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(oldPassword);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText("Email or password is incorrect.")).toBeVisible();

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(newPassword);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/onboarding\/profile$/);

    await page.goto("/login");
    await expect(page).toHaveURL(/\/onboarding\/profile$/);
    expect(new URL(page.url()).searchParams.has("password")).toBe(false);
  });
});
