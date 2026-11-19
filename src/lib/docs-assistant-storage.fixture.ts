import type { ConversationLocks } from "./docs-assistant-storage";

export function serialConversationLocks(): ConversationLocks {
  const pending = new Map<string, Promise<void>>();
  return {
    request(name, options, callback) {
      const result = (pending.get(name) ?? Promise.resolve()).then(() => {
        options.signal.throwIfAborted();
        return callback();
      });
      pending.set(
        name,
        result.then(
          () => {},
          () => {},
        ),
      );
      return result;
    },
  };
}
