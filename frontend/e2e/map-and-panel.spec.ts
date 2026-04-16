import { expect, test } from "@playwright/test";

test("layer toggles and map shell render", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("map-canvas")).toBeVisible();

  const parkingToggle = page.getByTestId("layer-parking");
  await expect(parkingToggle).toHaveAttribute("aria-pressed", "true");
  await parkingToggle.click();
  await expect(parkingToggle).toHaveAttribute("aria-pressed", "false");
  await parkingToggle.click();
  await expect(parkingToggle).toHaveAttribute("aria-pressed", "true");
});

test("eco panel supports snap states", async ({ page }) => {
  await page.goto("/");

  const sheet = page.getByTestId("eco-sheet");
  await expect(sheet).toBeVisible();

  await page.getByTestId("sheet-full").click();
  await expect(sheet).toHaveAttribute("data-state", "full");

  await page.getByTestId("sheet-min").click();
  await expect(sheet).toHaveAttribute("data-state", "min");

  await page.getByTestId("sheet-half").click();
  await expect(sheet).toHaveAttribute("data-state", "half");
});
