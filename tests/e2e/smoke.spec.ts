import { expect, test } from "@playwright/test";

test("renders the Clauble shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Clauble" })).toBeVisible();
  await expect(page.getByText("Cycle 00A")).toBeVisible();
});

test("reports service health", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({
    service: "clauble",
    status: "ok",
  });
});

