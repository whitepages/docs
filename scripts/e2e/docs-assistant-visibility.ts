import assert from "node:assert/strict";
import type { Page } from "playwright";
import { parseRecall } from "../../src/lib/docs-assistant";
import { ConversationIndexSchema } from "../../src/lib/docs-assistant-storage";

type Wait = (check: () => Promise<boolean>) => Promise<void>;

export async function verifyVisibility(
  page: Page,
  until: Wait,
  storageKey: string,
  conversation: string,
): Promise<void> {
  const saved = await page.evaluate(
    (key) => localStorage.getItem(key),
    storageKey,
  );
  assert(saved);
  const index = ConversationIndexSchema.parse(JSON.parse(saved));
  const now = Date.now();
  const cutoff = now - 30 * 24 * 60 * 60 * 1000;
  const recall = parseRecall({
    conversation_id: conversation,
    records: [
      {
        id: crypto.randomUUID(),
        role: "customer",
        content: "Expired customer question",
        created_at: new Date(cutoff - 1).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Boundary answer",
        created_at: new Date(cutoff).toISOString(),
      },
    ],
    interrupted: false,
  });
  let recalls = 0;
  const route = "**/api/v1/docs-assistant/conversations/recall";
  await page.route(route, async (request) => {
    recalls += 1;
    await request.fulfill({ json: recall });
  });
  try {
    await page.clock.setFixedTime(new Date(now));
    await page.reload();
    await page.getByTestId("docs-assistant-open").click();
    await until(
      async () =>
        (await page.getByTestId("docs-assistant-assistant").count()) === 1,
    );
    assert.equal(await page.getByTestId("docs-assistant-customer").count(), 0);
    assert(
      (
        await page.getByTestId("docs-assistant-assistant").textContent()
      )?.includes("Boundary answer"),
    );
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: storageKey,
      value: JSON.stringify({
        ...index,
        conversations: index.conversations.map((entry) =>
          entry.id === conversation
            ? { ...entry, lastInteractionAt: null }
            : entry,
        ),
      }),
    });
    await page.clock.setFixedTime(new Date(now + 1));
    await page.reload();
    await page.getByTestId("docs-assistant-open").click();
    await page.getByTestId("docs-assistant-welcome").waitFor();
    assert.equal(await page.getByTestId("docs-assistant-customer").count(), 0);
    assert.equal(await page.getByTestId("docs-assistant-assistant").count(), 0);
    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      storageKey,
    );
    assert(stored);
    const expired = ConversationIndexSchema.parse(JSON.parse(stored));
    assert.equal(
      expired.conversations.find(({ id }) => id === conversation)
        ?.lastInteractionAt,
      cutoff,
    );
    const recallCount = recalls;
    await page.reload();
    await page.getByTestId("docs-assistant-open").click();
    await page.getByTestId("docs-assistant-welcome").waitFor();
    assert.equal(
      recalls,
      recallCount,
      "Known inactive history must not be recalled or renewed",
    );
  } finally {
    await page.unroute(route);
    await page.clock.setFixedTime(new Date());
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: storageKey,
      value: saved,
    });
  }
}
