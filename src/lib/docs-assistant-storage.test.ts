import { describe, expect, it } from "bun:test";
import { assistantDestination, BrowserRecallSchema } from "./docs-assistant";
import {
  conversationStorageKey,
  readConversation,
  saveConversation,
} from "./docs-assistant-storage";

const gateway = "https://gateway.example.test";
const conversation = "a899c12d-3e77-4faa-8cce-79bf57761ccd";

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

describe("remembered documentation conversation", () => {
  it("stores only a validated capability, not transcript or browser-flow data", () => {
    const storage = memoryStorage();
    expect(saveConversation(storage, gateway, conversation)).toBe(true);
    expect([...storage.values.values()]).toEqual([conversation]);
    expect(readConversation(storage, gateway)).toBe(conversation);
    expect(saveConversation(storage, gateway, "not-a-conversation")).toBe(
      false,
    );
    expect(readConversation(storage, gateway)).toBe(conversation);
  });

  it("isolates gateways but normalizes their paths to the fixed API origin", () => {
    const storage = memoryStorage();
    saveConversation(storage, gateway, conversation);
    expect(readConversation(storage, `${gateway}/ignored/path`)).toBe(
      conversation,
    );
    expect(
      readConversation(storage, "https://different.example.test"),
    ).toBeNull();
  });

  it("clears only its own saved pointer for a new conversation", () => {
    const storage = memoryStorage();
    storage.setItem("unrelated", "keep");
    saveConversation(storage, gateway, conversation);
    expect(saveConversation(storage, gateway, null)).toBe(true);
    expect(readConversation(storage, gateway)).toBeNull();
    expect(storage.getItem("unrelated")).toBe("keep");
  });

  it("ignores malformed values and tolerates unavailable or blocked storage", () => {
    const storage = memoryStorage();
    storage.setItem(conversationStorageKey(gateway), "corrupt");
    expect(readConversation(storage, gateway)).toBeNull();
    expect(readConversation(null, gateway)).toBeNull();
    expect(saveConversation(null, gateway, conversation)).toBe(false);
    const blocked = {
      getItem: () => {
        throw new Error("Blocked");
      },
      setItem: () => {
        throw new Error("Blocked");
      },
      removeItem: () => {
        throw new Error("Blocked");
      },
    };
    expect(readConversation(blocked, gateway)).toBeNull();
    expect(saveConversation(blocked, gateway, conversation)).toBe(false);
    expect(saveConversation(blocked, gateway, null)).toBe(false);
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
        browser_flow_id: conversation,
      }).success,
    ).toBe(false);
    expect(
      BrowserRecallSchema.parse({
        conversation_id: conversation,
        browser_flow_id: conversation,
      }).conversation_id,
    ).toBe(conversation);
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
