import { describe, expect, it } from "bun:test";
import { assistantDestination, BrowserRecallSchema } from "./docs-assistant";
import {
  conversationStorageKey,
  forgetConversation,
  migrateConversation,
  legacyConversationStorageKey,
  readConversation,
  readConversationIndex,
  saveConversation,
} from "./docs-assistant-storage";

import { serialConversationLocks } from "./docs-assistant-storage.fixture";

const locked = { locks: serialConversationLocks() };
const gateway = "https://gateway.example.test";
const firstConversation = "a899c12d-3e77-4faa-8cce-79bf57761ccd";
const secondConversation = "ba40facf-b176-4ccf-b9d6-be994880e43d";
const now = Date.parse("2026-11-19T12:00:00Z");
const day = 24 * 60 * 60 * 1000;

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

describe("remembered documentation conversations", () => {
  it("stores only versioned IDs, active selection and non-text activity metadata", async () => {
    const storage = memoryStorage();
    expect(
      await saveConversation(storage, gateway, firstConversation, now, locked),
    ).toBe(true);
    expect([...storage.values.values()]).toEqual([
      JSON.stringify({
        version: 2,
        activeConversation: firstConversation,
        conversations: [{ id: firstConversation, lastInteractionAt: now }],
      }),
    ]);
    expect(readConversation(storage, gateway, now)).toBe(firstConversation);
    expect(
      await saveConversation(
        storage,
        gateway,
        "not-a-conversation",
        null,
        locked,
      ),
    ).toBe(false);
    expect(readConversation(storage, gateway, now)).toBe(firstConversation);
  });

  it("isolates gateways but normalizes their paths to the fixed API origin", async () => {
    const storage = memoryStorage();
    await saveConversation(storage, gateway, firstConversation, null, locked);
    expect(readConversation(storage, `${gateway}/ignored/path`)).toBe(
      firstConversation,
    );
    expect(
      readConversation(storage, "https://different.example.test"),
    ).toBeNull();
  });

  it("deactivates on New, retains distinct histories and can select an older reference", async () => {
    const storage = memoryStorage();
    storage.setItem("unrelated", "keep");
    await saveConversation(
      storage,
      gateway,
      firstConversation,
      now - day,
      locked,
    );
    expect(await saveConversation(storage, gateway, null, null, locked)).toBe(
      true,
    );
    expect(readConversation(storage, gateway, now)).toBeNull();
    await saveConversation(storage, gateway, secondConversation, now, locked);
    expect(readConversationIndex(storage, gateway)).toEqual({
      version: 2,
      activeConversation: secondConversation,
      conversations: [
        { id: firstConversation, lastInteractionAt: now - day },
        { id: secondConversation, lastInteractionAt: now },
      ],
    });
    await saveConversation(storage, gateway, firstConversation, null, locked);
    expect(readConversation(storage, gateway, now)).toBe(firstConversation);
    expect(readConversationIndex(storage, gateway).conversations).toHaveLength(
      2,
    );
    expect(storage.getItem("unrelated")).toBe("keep");
  });

  it("migrates a valid v1 pointer without inventing interaction time", async () => {
    const storage = memoryStorage();
    storage.setItem(legacyConversationStorageKey(gateway), firstConversation);
    expect(readConversation(storage, gateway, now)).toBe(firstConversation);
    expect(readConversationIndex(storage, gateway).conversations).toEqual([
      { id: firstConversation, lastInteractionAt: null },
    ]);
    expect(storage.getItem(conversationStorageKey(gateway))).toBeNull();
    expect(await migrateConversation(storage, gateway, locked)).toBe(true);
    expect(storage.getItem(legacyConversationStorageKey(gateway))).toBeNull();
    await saveConversation(storage, gateway, null, null, locked);
    expect(readConversation(storage, gateway, now)).toBeNull();
    expect(readConversationIndex(storage, gateway).conversations).toHaveLength(
      1,
    );
  });

  it("preserves the valid legacy pointer if migration or a later write fails", async () => {
    const storage = memoryStorage();
    storage.setItem(legacyConversationStorageKey(gateway), firstConversation);
    const failedWrites = {
      ...storage,
      setItem: () => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      },
    };
    expect(readConversation(failedWrites, gateway, now)).toBe(
      firstConversation,
    );
    expect(await migrateConversation(failedWrites, gateway, locked)).toBe(
      false,
    );
    expect(
      await saveConversation(failedWrites, gateway, null, null, locked),
    ).toBe(false);
    expect(storage.getItem(legacyConversationStorageKey(gateway))).toBe(
      firstConversation,
    );
    expect(storage.getItem(conversationStorageKey(gateway))).toBeNull();
    expect(readConversation(storage, gateway, now)).toBe(firstConversation);
    expect(
      await saveConversation(
        failedWrites,
        gateway,
        secondConversation,
        null,
        locked,
      ),
    ).toBe(false);
    expect(readConversation(storage, gateway, now)).toBe(firstConversation);
  });

  it("makes v2 authoritative even when legacy removal is blocked", async () => {
    const storage = memoryStorage();
    storage.setItem(legacyConversationStorageKey(gateway), firstConversation);
    const failedRemoval = {
      ...storage,
      removeItem: () => {
        throw new DOMException("Blocked removal", "SecurityError");
      },
    };
    expect(readConversation(failedRemoval, gateway, now)).toBe(
      firstConversation,
    );
    expect(
      await saveConversation(failedRemoval, gateway, null, null, locked),
    ).toBe(true);
    expect(readConversation(failedRemoval, gateway, now)).toBeNull();
    expect(storage.getItem(legacyConversationStorageKey(gateway))).toBe(
      firstConversation,
    );
  });

  it("forgets only an expired reference, including when another is active", async () => {
    const storage = memoryStorage();
    await saveConversation(storage, gateway, firstConversation, null, locked);
    await saveConversation(storage, gateway, secondConversation, null, locked);
    expect(
      await forgetConversation(storage, gateway, firstConversation, locked),
    ).toBe(true);
    expect(readConversation(storage, gateway, now)).toBe(secondConversation);
    expect(readConversationIndex(storage, gateway).conversations).toEqual([
      { id: secondConversation, lastInteractionAt: null },
    ]);
    expect(
      await forgetConversation(storage, gateway, secondConversation, locked),
    ).toBe(true);
    expect(readConversationIndex(storage, gateway).conversations).toEqual([]);
    expect(readConversation(storage, gateway, now)).toBeNull();
  });

  it("does not renew activity on reads or timestamp-free selection", async () => {
    const storage = memoryStorage();
    await saveConversation(
      storage,
      gateway,
      firstConversation,
      now - 30 * day,
      locked,
    );
    expect(readConversation(storage, gateway, now)).toBe(firstConversation);
    await saveConversation(storage, gateway, firstConversation, null, locked);
    expect(readConversation(storage, gateway, now + 1)).toBeNull();
    expect(readConversationIndex(storage, gateway).conversations).toEqual([
      { id: firstConversation, lastInteractionAt: now - 30 * day },
    ]);
    await saveConversation(storage, gateway, firstConversation, now, locked);
    await saveConversation(
      storage,
      gateway,
      firstConversation,
      now - day,
      locked,
    );
    expect(readConversation(storage, gateway, now)).toBe(firstConversation);
    expect(
      readConversationIndex(storage, gateway).conversations[0]
        ?.lastInteractionAt,
    ).toBe(now);
  });

  it("rejects malformed index structure, duplicate IDs and arbitrary text fields", async () => {
    const storage = memoryStorage();
    for (const value of [
      "corrupt",
      JSON.stringify({
        version: 2,
        activeConversation: firstConversation,
        conversations: [],
      }),
      JSON.stringify({
        version: 2,
        activeConversation: null,
        conversations: [
          { id: firstConversation, lastInteractionAt: null },
          { id: firstConversation, lastInteractionAt: null },
        ],
      }),
      JSON.stringify({
        version: 2,
        activeConversation: firstConversation,
        conversations: [
          {
            id: firstConversation,
            lastInteractionAt: now,
            title: "not allowed",
          },
        ],
      }),
    ]) {
      storage.setItem(conversationStorageKey(gateway), value);
      expect(readConversation(storage, gateway, now)).toBeNull();
    }
    storage.setItem(legacyConversationStorageKey(gateway), firstConversation);
    expect(readConversation(storage, gateway, now)).toBe(firstConversation);
  });

  it("tolerates unavailable storage and never overwrites history when reads fail", async () => {
    const storage = memoryStorage();
    await saveConversation(storage, gateway, firstConversation, null, locked);
    const blocked = {
      ...storage,
      getItem: () => {
        throw new DOMException("Blocked", "SecurityError");
      },
    };
    expect(readConversation(null, gateway, now)).toBeNull();
    expect(
      await saveConversation(null, gateway, firstConversation, null, locked),
    ).toBe(false);
    expect(readConversation(blocked, gateway, now)).toBeNull();
    expect(
      await saveConversation(
        blocked,
        gateway,
        secondConversation,
        null,
        locked,
      ),
    ).toBe(false);
    expect(await saveConversation(blocked, gateway, null, null, locked)).toBe(
      false,
    );
    expect(
      await forgetConversation(blocked, gateway, firstConversation, locked),
    ).toBe(false);
    expect(readConversation(storage, gateway, now)).toBe(firstConversation);
  });
});

describe("documentation recall boundary", () => {
  it("uses the fixed POST route and non-null UUID request schema", () => {
    expect(
      assistantDestination(`${gateway}/other`, "conversations/recall").href,
    ).toBe(`${gateway}/api/v1/docs-assistant/conversations/recall`);
    expect(
      BrowserRecallSchema.safeParse({
        conversation_id: null,
        browser_flow_id: firstConversation,
      }).success,
    ).toBe(false);
    expect(
      BrowserRecallSchema.parse({
        conversation_id: firstConversation,
        browser_flow_id: secondConversation,
      }).conversation_id,
    ).toBe(firstConversation);
  });

  it("shares destination restrictions for recall and turns", () => {
    for (const operation of ["turns", "conversations/recall"] as const) {
      expect(() =>
        assistantDestination("http://remote.example.test", operation),
      ).toThrow();
      expect(() =>
        assistantDestination("javascript:alert(1)", operation),
      ).toThrow();
      expect(
        assistantDestination("http://127.0.0.1:8080", operation).protocol,
      ).toBe("http:");
    }
  });
});
