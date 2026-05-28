import { expect, test, type Page } from "@playwright/test";

async function preparePage(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("saigongreen.onboarding.v1", "1");
  });
}

async function dismissOnboarding(page: Page) {
  const onboarding = page.getByTestId("onboarding-flow");

  if (!(await onboarding.isVisible())) {
    return;
  }

  await onboarding.locator(".onboardingPersonaGrid button").first().click();
  await onboarding.locator(".onboardingTransportGrid button").first().click();
  await onboarding.locator(".onboardingStartBtn").click();
  await expect(onboarding).toBeHidden({ timeout: 10000 });
}

test("layer toggles and map shell render", async ({ page }) => {
  await preparePage(page);
  await page.goto("/");
  await dismissOnboarding(page);

  const mapContainer = page.locator(".leaflet-container").first();
  await expect(mapContainer).toBeVisible({ timeout: 15000 });

  const parkingToggle = page.getByTestId("layer-parking");
  await expect(parkingToggle).toHaveAttribute("aria-pressed", "true");
  await parkingToggle.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(parkingToggle).toHaveAttribute("aria-pressed", "false");
  await parkingToggle.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(parkingToggle).toHaveAttribute("aria-pressed", "true");
});

test("eco panel renders summary", async ({ page }) => {
  await preparePage(page);
  await page.goto("/");
  await dismissOnboarding(page);

  const sheet = page.getByTestId("eco-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText("CO2");
  await expect(sheet).toContainText("Eco Journey");
});

test("eco panel stays visible during keyboard input", async ({ page }) => {
  await preparePage(page);
  await page.goto("/");
  await dismissOnboarding(page);

  const sheet = page.getByTestId("eco-sheet");
  await expect(sheet).toBeVisible();
  await page.keyboard.press("Shift+ArrowUp");
  await page.keyboard.press("Escape");
  await expect(sheet).toBeVisible();
});

test("slot inspect opens mini dashboard and ai overlay", async ({ page }) => {
  await preparePage(page);
  await page.goto("/");
  await dismissOnboarding(page);

  const mapContainer = page.locator(".leaflet-container").first();
  await expect(mapContainer).toBeVisible({ timeout: 15000 });

  const inspect = page.locator('[data-testid^="inspect-slot-"]').first();
  await expect(inspect).toBeVisible({ timeout: 15000 });
  await inspect.click();

  const dashboard = page.getByTestId("slot-mini-dashboard");
  await expect(dashboard).toBeVisible();
  await expect(dashboard).toContainText(/Bãi S\d+/);
});

test("story mode can toggle and auto-dismiss bubble", async ({ page }) => {
  await preparePage(page);
  await page.goto("/");
  await dismissOnboarding(page);

  const storyToggle = page.getByTestId("layer-story");
  await expect(storyToggle).toHaveAttribute("aria-pressed", "true");

  const inspect = page.locator('[data-testid^="inspect-slot-"]').first();
  await expect(inspect).toBeVisible({ timeout: 15000 });
  await inspect.click();

  const storyBubble = page.getByTestId("story-bubble").first();
  await expect(storyBubble).toBeVisible();
  await expect(storyBubble).toContainText(/Với|Bãi|Đi bộ|Ra vô/i);
  await storyToggle.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(storyToggle).toHaveAttribute("aria-pressed", "false");

  await inspect.click();
  await expect(storyBubble).toBeHidden();
});

test("story voice controls can mute and persist", async ({ page }) => {
  await preparePage(page);
  await page.goto("/");
  await dismissOnboarding(page);

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
  await preparePage(page);
  await page.goto("/");
  await dismissOnboarding(page);

  await expect(page.getByTestId("ops-live")).toBeHidden();

  const adminToggle = page.getByTestId("admin-toggle");
  await expect(adminToggle).toBeVisible();
  await adminToggle.click();

  const compactToggle = page.getByTestId("ops-compact-btn");
  await expect(compactToggle).toBeVisible();

  await expect(page.getByTestId("ops-live")).toBeVisible();
  await expect(page.getByTestId("ops-slo")).toBeVisible();
  await expect(page.getByTestId("ops-export-csv")).toBeVisible();
  await expect(page.getByTestId("ops-incidents")).toContainText(
    /All systems operational\.|Minor performance degradation detected\.|Multiple services unavailable\. Investigating\./
  );
  await expect(page.getByTestId("ops-incidents")).not.toContainText("All systems nominal");

  await compactToggle.click();
  await expect(page.getByTestId("ops-slo")).toBeHidden();

  await page.getByTestId("ops-open").click();
  await expect(page.getByTestId("ops-slo")).toBeVisible();
});
