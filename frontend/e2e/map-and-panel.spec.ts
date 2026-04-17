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

  const inspect = page.locator('[data-testid^="inspect-slot-"]').first();
  await expect(inspect).toBeVisible({ timeout: 15000 });
  await inspect.click();

  const dashboard = page.getByTestId("slot-mini-dashboard");
  await expect(dashboard).toBeVisible();
  await expect(dashboard).toContainText("Slot S1");

  await expect(page.getByTestId("ai-overlay-tag")).toContainText("AI Tracking S1");
});

test("story mode can toggle and auto-dismiss bubble", async ({ page }) => {
  await page.goto("/");

  const storyToggle = page.getByTestId("layer-story");
  await expect(storyToggle).toHaveAttribute("aria-pressed", "true");

  const inspect = page.locator('[data-testid^="inspect-slot-"]').first();
  await expect(inspect).toBeVisible({ timeout: 15000 });
  await inspect.click();

  const storyBubble = page.getByTestId("story-bubble");
  await expect(storyBubble).toBeVisible();
  await expect(storyBubble).toContainText(/Khu|Hướng/);

  await expect(storyBubble).toBeHidden({ timeout: 7000 });

  await storyToggle.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(storyToggle).toHaveAttribute("aria-pressed", "false");

  await inspect.click();
  await expect(storyBubble).toBeHidden();
});

test("story voice controls can mute and persist", async ({ page }) => {
  await page.goto("/");

  const inspect = page.locator('[data-testid^="inspect-slot-"]').first();
  await expect(inspect).toBeVisible({ timeout: 15000 });
  await inspect.click();

  const storyBubble = page.getByTestId("story-bubble");
  await expect(storyBubble).toBeVisible();

  const voiceToggle = page.getByTestId("story-voice-toggle");
  await expect(voiceToggle).toContainText("🔊");
  await voiceToggle.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(voiceToggle).toContainText("🔇");

  await expect.poll(async () => {
    return page.evaluate(() => window.localStorage.getItem("greenpark-story-voice"));
  }).toBe("off");

  const stopVoice = page.getByTestId("story-voice-stop");
  await stopVoice.evaluate((element) => (element as HTMLButtonElement).click());

  await inspect.click();
  await expect(storyBubble).toBeVisible();
  await expect(voiceToggle).toContainText("🔇");
});

test("enterprise ops command center renders SLO and controls", async ({ page }) => {
  await page.goto("/");

  const opsToggle = page.getByTestId("ops-toggle");
  await expect(opsToggle).toBeVisible();

  await expect(page.getByTestId("ops-live")).toBeVisible();
  await expect(page.getByTestId("ops-slo")).toBeVisible();
  await expect(page.getByTestId("ops-export-csv")).toBeVisible();

  await opsToggle.click();
  await expect(page.getByTestId("ops-slo")).toBeHidden();
  await opsToggle.click();
  await expect(page.getByTestId("ops-slo")).toBeVisible();
});
