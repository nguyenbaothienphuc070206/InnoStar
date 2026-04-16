import { expect, test } from "@playwright/test";

test("layer toggles and map shell render", async ({ page }) => {
  await page.goto("/");

  const mapContainer = page.locator(".leaflet-container").first();
  await expect(mapContainer).toBeVisible({ timeout: 15000 });

  const parkingToggle = page.getByTestId("layer-parking");
  await expect(parkingToggle).toHaveAttribute("aria-pressed", "true");
  await parkingToggle.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(parkingToggle).toHaveAttribute("aria-pressed", "false");
  await parkingToggle.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(parkingToggle).toHaveAttribute("aria-pressed", "true");
});

test("eco panel supports compact toggle", async ({ page }) => {
  await page.goto("/");

  const sheet = page.getByTestId("eco-sheet");
  await expect(sheet).toBeVisible();

  await page.getByTestId("panel-compact").click();
  await expect(sheet).toContainText("Eco Journey");

  await page.getByTestId("panel-compact").click();
  await expect(sheet).toContainText("Top 82% users");
});

test("slot inspect opens mini dashboard and ai overlay", async ({ page }) => {
  await page.goto("/");

  const mapContainer = page.locator(".leaflet-container").first();
  await expect(mapContainer).toBeVisible({ timeout: 15000 });

  const inspect = page.getByTestId("inspect-slot-1");
  await expect(inspect).toBeVisible({ timeout: 15000 });
  await inspect.click();

  const dashboard = page.getByTestId("slot-mini-dashboard");
  await expect(dashboard).toBeVisible();
  await expect(dashboard).toContainText("Slot S1");

  await expect(page.getByTestId("ai-overlay-tag")).toContainText("AI Tracking S1");
});
