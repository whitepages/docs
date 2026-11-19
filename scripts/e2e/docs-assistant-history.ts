import assert from "node:assert/strict";
import type { Page } from "playwright";
import type { BrowserTurn } from "../../src/lib/docs-assistant";
import {
  ConversationIndexSchema,
  conversationStorageKey,
  legacyConversationStorageKey,
  type ConversationIndex,
} from "../../src/lib/docs-assistant-storage";

async function storedIndex(
  page: Page,
  key: string,
): Promise<ConversationIndex> {
  const value = await page.evaluate((key) => localStorage.getItem(key), key);
  assert(value);
  return ConversationIndexSchema.parse(JSON.parse(value));
}

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
    (await storedIndex(page, key)).activeConversation,
    data.conversation,
  );
  const legacyKey = legacyConversationStorageKey(data.gatewayOrigin);
  await page.evaluate(
    ({ key, legacyKey, conversation }) => {
      localStorage.setItem(legacyKey, conversation);
      localStorage.removeItem(key);
    },
    { key, legacyKey, conversation: data.conversation },
  );
  await page.reload();
  await page.getByTestId("docs-assistant-open").click();
  await until(
    async () =>
      (await page.getByTestId("docs-assistant-customer").count()) === 2,
  );
  assert.equal(data.turns.length, 2, "Recall must not generate another answer");
  assert.equal(
    await page.evaluate((key) => localStorage.getItem(key), legacyKey),
    null,
  );
  const migrated = await storedIndex(page, key);
  assert.equal(migrated.activeConversation, data.conversation);
  assert(migrated.conversations[0]?.lastInteractionAt);
  const rememberedActivity = migrated.conversations[0].lastInteractionAt;
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
  assert.equal(
    (await storedIndex(page, key)).conversations[0]?.lastInteractionAt,
    rememberedActivity,
    "Read-only recall must not refresh interaction time",
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
  await until(
    async () => await page.getByTestId("docs-assistant-question").isEnabled(),
  );
  const fresh = await storedIndex(page, key);
  assert.equal(fresh.activeConversation, null);
  assert.deepEqual(
    fresh.conversations.map(({ id }) => id),
    [data.conversation],
  );
  await page.reload();
  await page.getByTestId("docs-assistant-open").click();
  await page.getByTestId("docs-assistant-welcome").waitFor();
  assert.equal(await page.getByTestId("docs-assistant-customer").count(), 0);
  return key;
}

export async function verifySeparatedHistory(
  page: Page,
  until: Wait,
  data: {
    readonly storageKey: string;
    readonly firstConversation: string;
    readonly secondConversation: string;
  },
): Promise<void> {
  assert.notEqual(data.firstConversation, data.secondConversation);
  const index = await storedIndex(page, data.storageKey);
  assert.equal(index.activeConversation, data.secondConversation);
  assert.deepEqual(
    index.conversations.map(({ id }) => id),
    [data.firstConversation, data.secondConversation],
  );
  for (const [conversation, expectedCustomers] of [
    [data.firstConversation, 3],
    [data.secondConversation, 1],
  ] as const) {
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: data.storageKey,
      value: JSON.stringify({ ...index, activeConversation: conversation }),
    });
    await page.reload();
    await page.getByTestId("docs-assistant-open").click();
    await until(
      async () =>
        (await page.getByTestId("docs-assistant-customer").count()) ===
        expectedCustomers,
    );
    const questions = await page
      .getByTestId("docs-assistant-customer")
      .allTextContents();
    assert.equal(
      questions.some((question) =>
        question.includes("How do I get started with the API?"),
      ),
      conversation === data.secondConversation,
    );
  }
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
    (await storedIndex(page, data.storageKey)).activeConversation,
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
    (await storedIndex(page, data.storageKey)).activeConversation,
    null,
  );
  assert(
    !(await storedIndex(page, data.storageKey)).conversations.some(
      ({ id }) => id === data.conversation,
    ),
  );
  assert.equal(
    (await storedIndex(page, data.storageKey)).conversations.length,
    1,
    "Expiry must retain the other conversation reference",
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
        throw new DOMException("Blocked storage", "SecurityError");
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key.startsWith("docs-assistant:conversation:"))
        throw new DOMException("Blocked storage", "SecurityError");
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
