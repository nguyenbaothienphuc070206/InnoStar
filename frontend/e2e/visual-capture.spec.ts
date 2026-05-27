import { expect, test } from "@playwright/test";

test("capture home visual baseline", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator(".leaflet-container").first()).toBeVisible({ timeout: 15000 });

  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach("home-map", {
    body: screenshot,
    contentType: "image/png"
  });
});

test("capture admin visual baseline", async ({ page }, testInfo) => {
  await page.goto("/admin");
  await expect(page.getByText("GreenPark AI - Admin Dashboard")).toBeVisible();

  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach("admin-dashboard", {
    body: screenshot,
    contentType: "image/png"
  });
});
