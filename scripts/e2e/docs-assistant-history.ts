import assert from "node:assert/strict";
import type { Page } from "playwright";
import type { BrowserTurn } from "../../src/lib/docs-assistant";
import { conversationStorageKey } from "../../src/lib/docs-assistant-storage";

type Wait = (check: () => Promise<boolean>) => Promise<void>;

export async function verifyHistory(
  page: Page,
  until: Wait,
  data: {
    readonly siteOrigin: string;
    readonly gatewayOrigin: string;
    readonly conversation: string;
    readonly turns: readonly BrowserTurn[];
    readonly recalls: () => number;
  },
): Promise<string> {
  const key = conversationStorageKey(data.gatewayOrigin);
  assert.equal(
    await page.evaluate((key) => localStorage.getItem(key), key),
    data.conversation,
  );
  await page.reload();
  await page.getByTestId("docs-assistant-open").click();
  await until(
    async () =>
      (await page.getByTestId("docs-assistant-customer").count()) === 2,
  );
  assert.equal(data.turns.length, 2, "Recall must not generate another answer");
  assert(
    !(await page.getByTestId("docs-assistant-panel").textContent())?.includes(
      "private stored",
    ),
  );
  const recallCount = data.recalls();
  await page.goto(`${data.siteOrigin}/docs/documentation/getting-started`);
  await page.getByTestId("cookie-consent-banner").waitFor();
  assert.equal(await page.getByTestId("docs-assistant-open").count(), 0);
  assert.equal(data.recalls(), recallCount);
  await page.goto(
    `${data.siteOrigin}/docs/documentation/getting-started?docChat=1`,
  );
  await page.getByTestId("docs-assistant-open").click();
  await until(
    async () =>
      (await page.getByTestId("docs-assistant-customer").count()) === 2,
  );
  await page
    .getByTestId("docs-assistant-question")
    .fill("How do I authenticate a request?");
  await page.getByTestId("docs-assistant-send").click();
  await until(
    async () => await page.getByTestId("docs-assistant-question").isEnabled(),
  );
  assert.equal(data.turns[2].conversation_id, data.conversation);
  assert.notEqual(data.turns[2].browser_flow_id, data.turns[0].browser_flow_id);
  assert.equal(data.turns[2].page.path, "/docs/documentation/getting-started");
  await page.getByTestId("docs-assistant-new").click();
  assert.equal(
    await page.evaluate((key) => localStorage.getItem(key), key),
    null,
  );
  await page.reload();
  await page.getByTestId("docs-assistant-open").click();
  await page.getByTestId("docs-assistant-welcome").waitFor();
  assert.equal(await page.getByTestId("docs-assistant-customer").count(), 0);
  return key;
}

export async function verifyRecallFailures(
  page: Page,
  until: Wait,
  data: {
    readonly storageKey: string;
    readonly conversation: string;
    readonly setStatus: (status: number) => void;
    readonly recalls: () => number;
  },
): Promise<void> {
  data.setStatus(503);
  await page.reload();
  await page.getByTestId("docs-assistant-open").click();
  await page.getByTestId("docs-assistant-restore-retry").waitFor();
  assert(await page.getByTestId("docs-assistant-question").isDisabled());
  assert.equal(
    await page.evaluate((key) => localStorage.getItem(key), data.storageKey),
    data.conversation,
  );
  data.setStatus(200);
  await page.getByTestId("docs-assistant-restore-retry").click();
  await until(
    async () =>
      (await page.getByTestId("docs-assistant-customer").count()) === 1,
  );
  data.setStatus(404);
  await page.reload();
  await page.getByTestId("docs-assistant-open").click();
  await page.getByTestId("docs-assistant-welcome").waitFor();
  assert.equal(
    await page.evaluate((key) => localStorage.getItem(key), data.storageKey),
    null,
  );
  data.setStatus(200);
  await page.evaluate(
    (key) => localStorage.setItem(key, "corrupt"),
    data.storageKey,
  );
  const count = data.recalls();
  await page.reload();
  await page.getByTestId("docs-assistant-open").click();
  await page.getByTestId("docs-assistant-welcome").waitFor();
  assert.equal(data.recalls(), count);
}

export async function verifyBlockedStorage(
  page: Page,
  until: Wait,
): Promise<void> {
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (this: Storage, key: string) {
      if (key.startsWith("docs-assistant:conversation:"))
        throw new Error("Blocked storage");
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key.startsWith("docs-assistant:conversation:"))
        throw new Error("Blocked storage");
      set.call(this, key, value);
    };
  });
  await page.reload();
  await page.getByTestId("docs-assistant-open").click();
  await page.getByTestId("docs-assistant-welcome").waitFor();
  await page.getByTestId("docs-assistant-starter-getting-started").click();
  await until(
    async () => await page.getByTestId("docs-assistant-question").isEnabled(),
  );
  await page.getByTestId("docs-assistant-storage-unavailable").waitFor();
  assert.equal(await page.getByTestId("docs-assistant-customer").count(), 1);
}
