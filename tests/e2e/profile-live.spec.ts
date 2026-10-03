import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const liveAuthEnabled = process.env.CLAUBLE_AUTH_LIVE === "1";
const mailpitUrl = "http://127.0.0.1:55324";
const localDatabaseUrl = "postgresql://postgres:postgres@127.0.0.1:55322/postgres";

type MailpitAddress = { Address: string };
type MailpitMessage = { ID: string; Subject: string; To: MailpitAddress[] };

async function findMessage(
  request: APIRequestContext,
  email: string,
): Promise<string | null> {
  const response = await request.get(`${mailpitUrl}/api/v1/messages?limit=100`);
  if (!response.ok()) return null;
  const body = (await response.json()) as { messages?: MailpitMessage[] };
  return (
    body.messages?.find(
      (message) =>
        message.Subject === "Confirm your Clauble account" &&
        message.To.some((recipient) => recipient.Address === email),
    )?.ID ?? null
  );
}

async function confirmationLink(
  request: APIRequestContext,
  messageId: string,
): Promise<string> {
  const response = await request.get(`${mailpitUrl}/api/v1/message/${messageId}`);
  expect(response.ok()).toBe(true);
  const message = (await response.json()) as { HTML?: string };
  const match = message.HTML?.match(/href="([^"]+\/auth\/confirm[^"]*)"/);
  expect(match?.[1]).toBeTruthy();
  return match![1].replaceAll("&amp;", "&");
}

async function createConfirmedAccount(
  page: Page,
  request: APIRequestContext,
  email: string,
  password: string,
) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/auth\/check-email$/);

  let messageId: string | null = null;
  await expect
    .poll(async () => {
      messageId = await findMessage(request, email);
      return messageId;
    })
    .not.toBeNull();

  const emailLink = new URL(await confirmationLink(request, messageId!));
  const applicationOrigin = new URL(page.url()).origin;
  await page.goto(`${applicationOrigin}${emailLink.pathname}${emailLink.search}`);
  await expect(page).toHaveURL(/\/onboarding\/profile$/);
}

function inspectCreatedPerson(username: string): {
  idsMatch: boolean;
  status: string;
  profileCompletedAt: string;
} {
  const query = [
    "select json_build_object(",
    "'idsMatch', p.id = u.id,",
    "'status', p.status,",
    "'profileCompletedAt', p.profile_completed_at",
    ")",
    "from public.people p",
    "join auth.users u on u.id = p.id",
    `where p.username = '${username}'`,
  ].join(" ");
  const output = execFileSync("psql", [localDatabaseUrl, "-Atc", query], {
    encoding: "utf8",
  }).trim();
  return JSON.parse(output) as {
    idsMatch: boolean;
    status: string;
    profileCompletedAt: string;
  };
}

function personCountForEmail(email: string): number {
  const query = [
    "select count(*)",
    "from public.people p",
    "join auth.users u on u.id = p.id",
    `where u.email = '${email}'`,
  ].join(" ");
  return Number(execFileSync("psql", [localDatabaseUrl, "-Atc", query], { encoding: "utf8" }).trim());
}

function suspendPerson(username: string): void {
  execFileSync(
    "psql",
    [
      localDatabaseUrl,
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `update public.people set status = 'suspended' where username = '${username}'`,
    ],
    { stdio: "ignore" },
  );
}

function inspectAvatar(username: string): { count: number; path: string | null } {
  const query = [
    "select json_build_object(",
    "'count', count(o.id),",
    "'path', max(p.avatar_path)",
    ")",
    "from public.people p",
    "left join storage.objects o on o.bucket_id = 'avatars' and o.name = p.avatar_path",
    `where p.username = '${username}'`,
  ].join(" ");
  return JSON.parse(
    execFileSync("psql", [localDatabaseUrl, "-Atc", query], { encoding: "utf8" }).trim(),
  ) as { count: number; path: string | null };
}

test.describe("local identity to People flow", () => {
  test.skip(!liveAuthEnabled, "Set CLAUBLE_AUTH_LIVE=1 with the local Supabase stack running.");

  test("completes a public profile and rejects a duplicate username", async ({ browser, page, request }) => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 16);
    const username = `cycle${suffix}`;
    const password = `Profile-${randomUUID()}-7`;
    const firstEmail = `cycle-01b-a-${suffix}@example.test`;
    const secondEmail = `cycle-01b-b-${suffix}@example.test`;

    await createConfirmedAccount(page, request, firstEmail, password);
    expect(personCountForEmail(firstEmail)).toBe(0);
    await page.getByLabel("Username").fill(` ${username.toUpperCase()} `);
    await page.getByLabel("Display name").fill("Cycle 01B Person");
    await page.getByLabel("Headline").fill("Building in public");
    await page.getByLabel("Website").fill("https://example.com/profile");
    await page.getByRole("button", { name: "Create profile" }).click();

    await expect(page).toHaveURL(new RegExp(`/u/${username}$`));
    await expect(page.getByRole("heading", { name: "Cycle 01B Person" })).toBeVisible();
    await expect(page.getByText(`@${username}`, { exact: true })).toBeVisible();
    await expect(page.getByText("Building in public")).toBeVisible();

    const stored = inspectCreatedPerson(username);
    expect(stored.idsMatch).toBe(true);
    expect(stored.status).toBe("active");
    expect(stored.profileCompletedAt).toBeTruthy();

    await page.goto("/onboarding/profile");
    await expect(page).toHaveURL(new RegExp(`/u/${username}$`));

    const anonymousContext = await browser.newContext();
    const publicPage = await anonymousContext.newPage();
    await publicPage.goto(`/u/${username.toUpperCase()}`);
    await expect(publicPage).toHaveURL(new RegExp(`/u/${username}$`));
    await expect(publicPage.getByRole("heading", { name: "Cycle 01B Person" })).toBeVisible();

    suspendPerson(username);
    const hiddenResponse = await publicPage.goto(`/u/${username}`);
    expect(hiddenResponse?.status()).toBe(404);
    await anonymousContext.close();

    await page.goto("/onboarding/profile");
    await expect(page).toHaveURL(/\/account\/restricted$/);

    await page.request.post("/auth/signout");
    await createConfirmedAccount(page, request, secondEmail, password);
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Display name").fill("Duplicate Attempt");
    await page.getByRole("button", { name: "Create profile" }).click();
    await expect(page.getByText("This username is unavailable.").first()).toBeVisible();
    await expect(page).toHaveURL(/\/onboarding\/profile$/);
    expect(personCountForEmail(secondEmail)).toBe(0);
  });

  test("edits a profile and completes the avatar replace/delete lifecycle", async ({ page, request }) => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 16);
    const originalUsername = `before${suffix}`;
    const changedUsername = `after${suffix}`;
    const email = `cycle-01c-${suffix}@example.test`;
    const password = `Profile-${randomUUID()}-7`;

    await createConfirmedAccount(page, request, email, password);
    await page.getByLabel("Username").fill(originalUsername);
    await page.getByLabel("Display name").fill("Cycle 01C Person");
    await page.getByRole("button", { name: "Create profile" }).click();

    await page.goto("/settings/profile");
    const stalePage = await page.context().newPage();
    await stalePage.goto("/settings/profile");
    await page.getByLabel("Username").fill(changedUsername);
    await page.getByLabel("Display name").fill("Cycle 01C Updated");
    await page.getByLabel("Bio").fill("Profile editing and avatar lifecycle verified.");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page).toHaveURL(/\/settings\/profile\?updated=profile$/);
    await expect(page.getByText("Profile saved.")).toBeVisible();

    await stalePage.getByLabel("Display name").fill("Stale overwrite attempt");
    await stalePage.getByRole("button", { name: "Save profile" }).click();
    await expect(
      stalePage.getByText("This profile changed in another request. Refresh the page before saving again."),
    ).toBeVisible();
    await stalePage.close();

    expect((await request.get(`/u/${originalUsername}`)).status()).toBe(404);
    const changedProfile = await request.get(`/u/${changedUsername}`);
    expect(changedProfile.status()).toBe(200);
    expect(await changedProfile.text()).toContain("Profile editing and avatar lifecycle verified.");

    const avatarRegion = page.getByRole("region", { name: "Avatar" });
    await avatarRegion.getByLabel("Upload avatar").setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    });
    await avatarRegion.locator("button", { hasText: "Upload avatar" }).click();
    await expect(page).toHaveURL(/\/settings\/profile\?updated=avatar$/);
    await expect(page.getByAltText("Cycle 01C Updated's avatar")).toBeVisible();

    const firstAvatar = inspectAvatar(changedUsername);
    expect(firstAvatar.count).toBe(1);
    expect(firstAvatar.path).toMatch(/\.png$/);

    await avatarRegion.getByLabel("Replace avatar").setInputFiles({
      name: "avatar.webp",
      mimeType: "image/webp",
      buffer: Buffer.from("RIFF0000WEBP"),
    });
    await avatarRegion.locator("button", { hasText: "Replace avatar" }).click();
    await expect
      .poll(() => inspectAvatar(changedUsername).path)
      .toMatch(/\.webp$/);
    await expect(avatarRegion.locator("button", { hasText: "Replace avatar" })).toBeEnabled();

    const replacedAvatar = inspectAvatar(changedUsername);
    expect(replacedAvatar.count).toBe(1);
    expect(replacedAvatar.path).toMatch(/\.webp$/);
    expect(replacedAvatar.path).not.toBe(firstAvatar.path);

    await avatarRegion.locator("button", { hasText: "Remove avatar" }).click();
    await expect(page).toHaveURL(/\/settings\/profile\?updated=avatar-removed$/);
    expect(inspectAvatar(changedUsername)).toEqual({ count: 0, path: null });
  });
});
