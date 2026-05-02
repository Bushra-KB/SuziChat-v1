import * as fs from "node:fs";
import * as path from "node:path";
import { test, expect } from "@playwright/test";

/**
 * Full-stack chess lobby → session flow (optional).
 *
 * Requires API + web running. Set:
 *   E2E_CHESS_FLOW=1
 *   E2E_API_URL=http://127.0.0.1:4000   (default)
 *   E2E_SESSION_A_PATH=/abs/path/to/session-a.json  — AuthSession JSON (same shape as localStorage suzi-chat-auth-session)
 *   E2E_SESSION_B_PATH=/abs/path/to/session-b.json
 *
 * Generate session JSON by logging in as two users in the app and copying localStorage value.
 */
test.describe("games chess flow (optional env)", () => {
  test.beforeEach(({}, testInfo) => {
    if (process.env.E2E_CHESS_FLOW !== "1") {
      testInfo.skip();
    }
    if (!process.env.E2E_SESSION_A_PATH || !process.env.E2E_SESSION_B_PATH) {
      testInfo.skip();
    }
  });

  test("two accounts: API creates chess session; both UIs show the board", async ({ browser }) => {
    const apiBase = (process.env.E2E_API_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");
    const pathA = process.env.E2E_SESSION_A_PATH!;
    const pathB = process.env.E2E_SESSION_B_PATH!;
    const rawA = fs.readFileSync(path.isAbsolute(pathA) ? pathA : path.join(process.cwd(), pathA), "utf8");
    const rawB = fs.readFileSync(path.isAbsolute(pathB) ? pathB : path.join(process.cwd(), pathB), "utf8");
    const sessionA = JSON.parse(rawA) as { accessToken: string };
    const sessionB = JSON.parse(rawB) as { accessToken: string };

    const headersJson = (token: string) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    });

    const createRes = await fetch(`${apiBase}/v1/games/lobbies`, {
      method: "POST",
      headers: headersJson(sessionA.accessToken),
      body: JSON.stringify({
        gameType: "CHESS",
        title: "E2E Chess Table",
      }),
    });
    expect(createRes.ok, await createRes.text()).toBeTruthy();
    const lobby = (await createRes.json()) as { id: string };

    const joinB = await fetch(`${apiBase}/v1/games/lobbies/${lobby.id}/join`, {
      method: "POST",
      headers: headersJson(sessionB.accessToken),
      body: JSON.stringify({ seatIndex: 0 }),
    });
    expect(joinB.ok, await joinB.text()).toBeTruthy();

    const joinA = await fetch(`${apiBase}/v1/games/lobbies/${lobby.id}/join`, {
      method: "POST",
      headers: headersJson(sessionA.accessToken),
      body: JSON.stringify({ seatIndex: 1 }),
    });
    expect(joinA.ok, await joinA.text()).toBeTruthy();

    const startRes = await fetch(`${apiBase}/v1/games/lobbies/${lobby.id}/start`, {
      method: "POST",
      headers: headersJson(sessionA.accessToken),
      body: JSON.stringify({}),
    });
    expect(startRes.ok, await startRes.text()).toBeTruthy();
    const started = (await startRes.json()) as { id: string };
    const sessionId = started.id;

    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    const loadSession = (json: string) => {
      window.localStorage.setItem("suzi-chat-auth-session", json);
    };

    await pageA.addInitScript(loadSession, rawA);
    await pageB.addInitScript(loadSession, rawB);

    await pageA.goto(`/app/games/chess/session/${sessionId}`);
    await pageB.goto(`/app/games/chess/session/${sessionId}`);

    await expect(pageA.getByTestId("chess-board-root")).toBeVisible({ timeout: 25_000 });
    await expect(pageB.getByTestId("chess-board-root")).toBeVisible({ timeout: 25_000 });

    await ctxA.close();
    await ctxB.close();
  });
});
