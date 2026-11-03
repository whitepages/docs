import { z } from "zod";
import { assistantDestination } from "./docs-assistant";

type ConversationStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const ConversationId = z.uuid();

export function browserConversationStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function conversationStorageKey(gateway: string): string {
  return `docs-assistant:conversation:v1:${assistantDestination(gateway, "turns").origin}`;
}

export function readConversation(
  storage: ConversationStorage | null,
  gateway: string,
): string | null {
  try {
    const parsed = ConversationId.safeParse(
      storage?.getItem(conversationStorageKey(gateway)),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveConversation(
  storage: ConversationStorage | null,
  gateway: string,
  conversation: string | null,
): boolean {
  try {
    if (!storage) return false;
    const key = conversationStorageKey(gateway);
    if (conversation === null) storage.removeItem(key);
    else storage.setItem(key, ConversationId.parse(conversation));
    return true;
  } catch {
    return false;
  }
}
