import { z } from "zod";
import { assistantDestination } from "./docs-assistant";
import {
  conversationVisible,
  latestInteractionTime,
} from "./docs-assistant-history";

type ConversationStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export interface ConversationLocks {
  request(
    name: string,
    options: { mode: "exclusive"; signal: AbortSignal },
    callback: () => boolean,
  ): Promise<boolean>;
}
interface ConversationWriteOptions {
  locks?: ConversationLocks | null;
  signal?: AbortSignal;
}
const ConversationId = z.uuid();
const ConversationEntry = z
  .strictObject({
    id: ConversationId,
    lastInteractionAt: z.number().int().nonnegative().nullable(),
  })
  .readonly();
export const ConversationIndexSchema = z
  .strictObject({
    version: z.literal(2),
    activeConversation: ConversationId.nullable(),
    conversations: z.array(ConversationEntry).readonly(),
  })
  .refine(
    (index) =>
      new Set(index.conversations.map(({ id }) => id)).size ===
        index.conversations.length &&
      (index.activeConversation === null ||
        index.conversations.some(({ id }) => id === index.activeConversation)),
  )
  .readonly();
export type ConversationIndex = z.infer<typeof ConversationIndexSchema>;

function emptyIndex(): ConversationIndex {
  return { version: 2, activeConversation: null, conversations: [] };
}

export function browserConversationStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function legacyConversationStorageKey(gateway: string): string {
  return `docs-assistant:conversation:v1:${assistantDestination(gateway, "turns").origin}`;
}

export function conversationStorageKey(gateway: string): string {
  return `docs-assistant:conversation:v2:${assistantDestination(gateway, "turns").origin}`;
}

function writeIndex(
  storage: ConversationStorage,
  gateway: string,
  index: ConversationIndex,
): void {
  storage.setItem(
    conversationStorageKey(gateway),
    JSON.stringify(ConversationIndexSchema.parse(index)),
  );
  try {
    storage.removeItem(legacyConversationStorageKey(gateway));
  } catch {}
}

function loadIndex(
  storage: ConversationStorage,
  gateway: string,
): ConversationIndex {
  const value = storage.getItem(conversationStorageKey(gateway));
  if (value !== null) {
    try {
      const parsed = ConversationIndexSchema.safeParse(JSON.parse(value));
      if (parsed.success) return parsed.data;
    } catch {}
  }
  const legacy = ConversationId.safeParse(
    storage.getItem(legacyConversationStorageKey(gateway)),
  );
  if (!legacy.success) return emptyIndex();
  return {
    version: 2,
    activeConversation: legacy.data,
    conversations: [{ id: legacy.data, lastInteractionAt: null }],
  };
}

export function readConversationIndex(
  storage: ConversationStorage | null,
  gateway: string,
): ConversationIndex {
  try {
    return storage ? loadIndex(storage, gateway) : emptyIndex();
  } catch {
    return emptyIndex();
  }
}

export function readConversation(
  storage: ConversationStorage | null,
  gateway: string,
  now: number = Date.now(),
): string | null {
  const index = readConversationIndex(storage, gateway);
  const active = index.conversations.find(
    ({ id }) => id === index.activeConversation,
  );
  return active && conversationVisible(active.lastInteractionAt, now)
    ? active.id
    : null;
}

function browserConversationLocks(): ConversationLocks | null {
  try {
    return navigator.locks ?? null;
  } catch {
    return null;
  }
}

async function withConversationLock(
  storage: ConversationStorage | null,
  gateway: string,
  options: ConversationWriteOptions,
  update: (storage: ConversationStorage) => boolean,
): Promise<boolean> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, 2_000);
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) abort();
  try {
    const locks =
      options.locks === undefined ? browserConversationLocks() : options.locks;
    if (!storage || !locks) return false;
    return await locks.request(
      conversationStorageKey(gateway),
      { mode: "exclusive", signal: controller.signal },
      () => (controller.signal.aborted ? false : update(storage)),
    );
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
}

export function migrateConversation(
  storage: ConversationStorage | null,
  gateway: string,
  options: ConversationWriteOptions = {},
): Promise<boolean> {
  return withConversationLock(storage, gateway, options, (available) => {
    const index = loadIndex(available, gateway);
    if (
      ConversationId.safeParse(
        available.getItem(legacyConversationStorageKey(gateway)),
      ).success
    )
      writeIndex(available, gateway, index);
    return true;
  });
}

export function saveConversation(
  storage: ConversationStorage | null,
  gateway: string,
  conversation: string | null,
  lastInteractionAt: number | null = null,
  options: ConversationWriteOptions = {},
): Promise<boolean> {
  return withConversationLock(storage, gateway, options, (available) => {
    const id = ConversationId.nullable().parse(conversation);
    const index = loadIndex(available, gateway);
    const existing = index.conversations.find((entry) => entry.id === id);
    const interaction = latestInteractionTime(
      existing?.lastInteractionAt ?? null,
      lastInteractionAt,
    );
    writeIndex(available, gateway, {
      ...index,
      activeConversation: id,
      conversations:
        id === null
          ? index.conversations
          : [
              ...index.conversations.filter((entry) => entry.id !== id),
              { id, lastInteractionAt: interaction },
            ],
    });
    return true;
  });
}

export function forgetConversation(
  storage: ConversationStorage | null,
  gateway: string,
  conversation: string,
  options: ConversationWriteOptions = {},
): Promise<boolean> {
  return withConversationLock(storage, gateway, options, (available) => {
    const index = loadIndex(available, gateway);
    writeIndex(available, gateway, {
      ...index,
      activeConversation:
        index.activeConversation === conversation
          ? null
          : index.activeConversation,
      conversations: index.conversations.filter(
        ({ id }) => id !== conversation,
      ),
    });
    return true;
  });
}
