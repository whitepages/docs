import assert from "node:assert/strict";
import type { Browser, Page } from "playwright";
import { BrowserTurnSchema } from "../../src/lib/docs-assistant";
import {
  ConversationIndexSchema,
  conversationStorageKey,
  legacyConversationStorageKey,
} from "../../src/lib/docs-assistant-storage";

type Wait = (check: () => Promise<boolean>) => Promise<void>;

async function holdIndex(page: Page, key: string, until: Wait): Promise<void> {
  await page.evaluate((key) => {
    document.documentElement.dataset.conversationLockHeld = "false";
    void navigator.locks.request(key, { mode: "exclusive" }, async () => {
      document.documentElement.dataset.conversationLockHeld = "true";
      await new Promise<void>((resolve) =>
        document.addEventListener(
          "release-conversation-lock",
          () => resolve(),
          { once: true },
        ),
      );
    });
  }, key);
  await until(
    async () =>
      await page.evaluate(
        () => document.documentElement.dataset.conversationLockHeld === "true",
      ),
  );
}

async function releaseIndex(page: Page): Promise<void> {
  await page.evaluate(() =>
    document.dispatchEvent(new Event("release-conversation-lock")),
  );
}

export async function verifyConversationLocks(
  browser: Browser,
  until: Wait,
  siteOrigin: string,
  gatewayOrigin: string,
): Promise<void> {
  const context = await browser.newContext();
  const key = conversationStorageKey(gatewayOrigin);
  const first = crypto.randomUUID();
  const second = crypto.randomUUID();
  const third = crypto.randomUUID();
  try {
    await context.route("**/*", (route) =>
      ["127.0.0.1", "localhost"].includes(
        new URL(route.request().url()).hostname,
      )
        ? route.continue()
        : route.abort(),
    );
    const owner = await context.newPage();
    const firstTab = await context.newPage();
    const secondTab = await context.newPage();
    await owner.goto(`${siteOrigin}/docs/documentation/getting-started`);
    await owner.evaluate(
      ({ key, id }) =>
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 2,
            activeConversation: null,
            conversations: [{ id, lastInteractionAt: null }],
          }),
        ),
      { key, id: first },
    );
    for (const [page, conversation] of [
      [firstTab, second],
      [secondTab, third],
    ] as const) {
      await page.route("**/api/v1/docs-assistant/turns", async (route) => {
        const turn = BrowserTurnSchema.parse(route.request().postDataJSON());
        const postTerminalCorruption =
          conversation === second ? "data: invalid-json\n\n" : "";
        await route.fulfill({
          contentType: "text/event-stream",
          body: `data: ${JSON.stringify({ type: "completed", conversation_id: conversation, request_id: turn.request_id })}\n\n${postTerminalCorruption}`,
        });
      });
      await page.goto(
        `${siteOrigin}/docs/documentation/getting-started?docChat=1`,
      );
      await page.getByTestId("docs-assistant-open").click();
      await page.getByTestId("docs-assistant-welcome").waitFor();
    }
    await holdIndex(owner, key, until);
    for (const page of [firstTab, secondTab]) {
      await page
        .getByTestId("docs-assistant-question")
        .fill("A synthetic concurrency question");
      await page.getByTestId("docs-assistant-send").click();
    }
    await until(
      async () =>
        await owner.evaluate(
          async (key) =>
            (await navigator.locks.query()).pending?.filter(
              (lock) => lock.name === key,
            ).length === 2,
          key,
        ),
    );
    const blocked = await owner.evaluate(
      (key) => localStorage.getItem(key),
      key,
    );
    assert(blocked);
    assert.deepEqual(
      ConversationIndexSchema.parse(JSON.parse(blocked)).conversations.map(
        ({ id }) => id,
      ),
      [first],
    );
    assert(await firstTab.getByTestId("docs-assistant-new").isDisabled());
    assert(await secondTab.getByTestId("docs-assistant-question").isDisabled());
    await releaseIndex(owner);
    for (const page of [firstTab, secondTab])
      await until(
        async () =>
          await page.getByTestId("docs-assistant-question").isEnabled(),
      );
    const saved = await owner.evaluate((key) => localStorage.getItem(key), key);
    assert(saved);
    assert.deepEqual(
      ConversationIndexSchema.parse(JSON.parse(saved))
        .conversations.map(({ id }) => id)
        .sort(),
      [first, second, third].sort(),
    );

    await holdIndex(owner, key, until);
    await firstTab.getByTestId("docs-assistant-new").click();
    assert(await firstTab.getByTestId("docs-assistant-question").isDisabled());
    await firstTab.evaluate(() =>
      window.history.pushState(null, "", window.location.pathname),
    );
    await until(
      async () =>
        (await firstTab.getByTestId("docs-assistant-open").count()) === 0,
    );
    await releaseIndex(owner);
    await until(
      async () =>
        await owner.evaluate(
          async (key) =>
            !(await navigator.locks.query()).pending?.some(
              (lock) => lock.name === key,
            ),
          key,
        ),
    );
    assert.equal(
      await owner.evaluate((key) => localStorage.getItem(key), key),
      saved,
      "A queued New must not clear active selection after query-gated unmount",
    );
  } finally {
    await context.close();
  }

  const unavailable = await browser.newContext();
  try {
    await unavailable.addInitScript(() =>
      Object.defineProperty(navigator, "locks", { value: undefined }),
    );
    await unavailable.route("**/*", (route) =>
      ["127.0.0.1", "localhost"].includes(
        new URL(route.request().url()).hostname,
      )
        ? route.continue()
        : route.abort(),
    );
    const page = await unavailable.newPage();
    const legacy = legacyConversationStorageKey(gatewayOrigin);
    const turns: ReturnType<typeof BrowserTurnSchema.parse>[] = [];
    await page.route("**/api/v1/docs-assistant/conversations/recall", (route) =>
      route.fulfill({
        json: { conversation_id: first, records: [], interrupted: false },
      }),
    );
    await page.route("**/api/v1/docs-assistant/turns", (route) => {
      const turn = BrowserTurnSchema.parse(route.request().postDataJSON());
      turns.push(turn);
      return route.fulfill({
        contentType: "text/event-stream",
        body: `data: ${JSON.stringify({ type: "completed", conversation_id: first, request_id: turn.request_id })}\n\n`,
      });
    });
    await page.goto(`${siteOrigin}/docs/documentation/getting-started`);
    await page.evaluate(({ key, id }) => localStorage.setItem(key, id), {
      key: legacy,
      id: first,
    });
    await page.goto(
      `${siteOrigin}/docs/documentation/getting-started?docChat=1`,
    );
    await page.getByTestId("docs-assistant-open").click();
    await page.getByTestId("docs-assistant-storage-unavailable").waitFor();
    for (const question of [
      "First page-local continuation",
      "Second page-local continuation",
    ]) {
      await page.getByTestId("docs-assistant-question").fill(question);
      await page.getByTestId("docs-assistant-send").click();
      await until(
        async () =>
          await page.getByTestId("docs-assistant-question").isEnabled(),
      );
    }
    assert.equal(turns.length, 2);
    assert(turns.every((turn) => turn.conversation_id === first));
    assert.equal(turns[0].browser_flow_id, turns[1].browser_flow_id);
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), key),
      null,
    );
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), legacy),
      first,
    );
  } finally {
    await unavailable.close();
  }
}
