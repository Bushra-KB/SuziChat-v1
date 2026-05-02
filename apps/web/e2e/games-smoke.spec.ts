import { test, expect } from "@playwright/test";

/**
 * Requires web + API running; override base URL with E2E_BASE_URL.
 * Skips when E2E_GAMES=0 (e.g. CI without a stack).
 */
test.describe("games shell", () => {
  test.beforeEach(({ }, testInfo) => {
    if (process.env.E2E_GAMES === "0") {
      testInfo.skip();
    }
  });

  test("games hub loads", async ({ page }) => {
    await page.goto("/app/games");
    await expect(page.getByRole("heading", { level: 2, name: /multiplayer game hub/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
