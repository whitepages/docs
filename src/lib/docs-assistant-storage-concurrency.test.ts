import { describe, expect, it } from "bun:test";
import {
  conversationStorageKey,
  forgetConversation,
  legacyConversationStorageKey,
  migrateConversation,
  readConversationIndex,
  saveConversation,
} from "./docs-assistant-storage";

const gateway = "https://gateway.example.test";
const first = "a899c12d-3e77-4faa-8cce-79bf57761ccd";
const second = "ba40facf-b176-4ccf-b9d6-be994880e43d";
const third = "e2816505-e581-486d-b64e-16a03a10880e";

import { serialConversationLocks } from "./docs-assistant-storage.fixture";

function memoryStorage() {
  const values = new Map<string, string>([
    [
      conversationStorageKey(gateway),
      JSON.stringify({
        version: 2,
        activeConversation: first,
        conversations: [{ id: first, lastInteractionAt: null }],
      }),
    ],
  ]);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

describe("conversation index concurrency", () => {
  it("retains both distinct additions when another tab starts between an index read and write", async () => {
    const storage = memoryStorage();
    const locks = serialConversationLocks();
    let interleaved = false;
    let otherSave: ReturnType<typeof saveConversation> | undefined;
    const firstTab = {
      ...storage,
      getItem: (key: string) => {
        const snapshot = storage.getItem(key);
        if (key === conversationStorageKey(gateway) && !interleaved) {
          interleaved = true;
          otherSave = saveConversation(storage, gateway, third, null, {
            locks,
          });
        }
        return snapshot;
      },
    };
    expect(
      await saveConversation(firstTab, gateway, second, null, { locks }),
    ).toBe(true);
    expect(await otherSave).toBe(true);
    expect(
      readConversationIndex(storage, gateway)
        .conversations.map(({ id }) => id)
        .sort(),
    ).toEqual([first, second, third].sort());
  });

  it("serializes targeted forget with a distinct addition without restoring or losing either", async () => {
    const storage = memoryStorage();
    const locks = serialConversationLocks();
    let interleaved = false;
    let addition: Promise<boolean> | undefined;
    const forgettingTab = {
      ...storage,
      getItem: (key: string) => {
        const snapshot = storage.getItem(key);
        if (key === conversationStorageKey(gateway) && !interleaved) {
          interleaved = true;
          addition = saveConversation(storage, gateway, third, null, { locks });
        }
        return snapshot;
      },
    };
    expect(
      await forgetConversation(forgettingTab, gateway, first, { locks }),
    ).toBe(true);
    expect(await addition).toBe(true);
    expect(readConversationIndex(storage, gateway)).toEqual({
      version: 2,
      activeConversation: third,
      conversations: [{ id: third, lastInteractionAt: null }],
    });
  });

  it("serializes concurrent migration and additions with no read-time writes", async () => {
    const storage = memoryStorage();
    storage.removeItem(conversationStorageKey(gateway));
    storage.setItem(legacyConversationStorageKey(gateway), first);
    const locks = serialConversationLocks();
    let interleaved = false;
    let addition: Promise<boolean> | undefined;
    const migratingTab = {
      ...storage,
      getItem: (key: string) => {
        const snapshot = storage.getItem(key);
        if (key === conversationStorageKey(gateway) && !interleaved) {
          interleaved = true;
          addition = saveConversation(storage, gateway, second, null, {
            locks,
          });
        }
        return snapshot;
      },
    };
    expect(readConversationIndex(storage, gateway).activeConversation).toBe(
      first,
    );
    expect(storage.getItem(conversationStorageKey(gateway))).toBeNull();
    const migration = migrateConversation(migratingTab, gateway, { locks });
    const otherMigration = migrateConversation(storage, gateway, { locks });
    expect(await migration).toBe(true);
    expect(await otherMigration).toBe(true);
    expect(await addition).toBe(true);
    expect(
      readConversationIndex(storage, gateway)
        .conversations.map(({ id }) => id)
        .sort(),
    ).toEqual([first, second].sort());
    expect(storage.getItem(legacyConversationStorageKey(gateway))).toBeNull();
  });

  it("retains read capability without performing any writes when Web Locks is unavailable or rejects", async () => {
    const storage = memoryStorage();
    storage.removeItem(conversationStorageKey(gateway));
    storage.setItem(legacyConversationStorageKey(gateway), first);
    for (const locks of [
      null,
      {
        request: async () => {
          throw new DOMException("Unavailable", "SecurityError");
        },
      },
    ]) {
      expect(await migrateConversation(storage, gateway, { locks })).toBe(
        false,
      );
      expect(
        await saveConversation(storage, gateway, second, null, { locks }),
      ).toBe(false);
      expect(await forgetConversation(storage, gateway, first, { locks })).toBe(
        false,
      );
      expect(readConversationIndex(storage, gateway).activeConversation).toBe(
        first,
      );
      expect(storage.getItem(conversationStorageKey(gateway))).toBeNull();
      expect(storage.getItem(legacyConversationStorageKey(gateway))).toBe(
        first,
      );
    }
  });

  it("cancels queued mutations without writes when their panel is disposed", async () => {
    const storage = memoryStorage();
    const locked: { signal?: AbortSignal; callback?: () => boolean } = {};
    const locks = {
      request: (
        _name: string,
        options: { signal: AbortSignal },
        callback: () => boolean,
      ) => {
        locked.signal = options.signal;
        locked.callback = callback;
        return new Promise<boolean>((resolve) =>
          options.signal.addEventListener("abort", () => resolve(false), {
            once: true,
          }),
        );
      },
    };
    const controller = new AbortController();
    const operation = saveConversation(storage, gateway, second, null, {
      locks,
      signal: controller.signal,
    });
    controller.abort();
    expect(await operation).toBe(false);
    expect(locked.signal?.aborted).toBe(true);
    expect(locked.callback?.()).toBe(false);
    expect(
      readConversationIndex(storage, gateway).conversations.map(({ id }) => id),
    ).toEqual([first]);
  });

  it("bounds lock-acquisition waits without writing after the deadline", async () => {
    const storage = memoryStorage();
    const pending: { callback?: () => boolean } = {};
    const locks = {
      request: (
        _name: string,
        options: { signal: AbortSignal },
        callback: () => boolean,
      ) => {
        pending.callback = callback;
        return new Promise<boolean>((_resolve, reject) =>
          options.signal.addEventListener(
            "abort",
            () => reject(options.signal.reason),
            { once: true },
          ),
        );
      },
    };
    expect(
      await saveConversation(storage, gateway, second, null, { locks }),
    ).toBe(false);
    expect(pending.callback?.()).toBe(false);
    expect(
      readConversationIndex(storage, gateway).conversations.map(({ id }) => id),
    ).toEqual([first]);
  });
});
