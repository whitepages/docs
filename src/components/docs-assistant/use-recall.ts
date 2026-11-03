"use client";

import { useEffect, useState } from "react";
import {
  assistantDestination,
  parseRecall,
  RecallStatus,
  type BrowserRecall,
} from "@/lib/docs-assistant";
import {
  browserConversationStorage,
  readConversation,
  saveConversation,
} from "@/lib/docs-assistant-storage";

export function useConversationRecall(
  gateway: string,
  onRecall: (recall: ReturnType<typeof parseRecall>) => void,
): { status: RecallStatus; retry: () => void; reset: () => void } {
  const [status, setStatus] = useState<RecallStatus>(RecallStatus.Loading);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const storage = browserConversationStorage();
    const conversation = readConversation(storage, gateway);
    if (!conversation) {
      setStatus(RecallStatus.Ready);
      return;
    }
    const controller = new AbortController();
    setStatus(RecallStatus.Loading);
    const timeout = setTimeout(() => {
      setStatus(RecallStatus.Failed);
      controller.abort();
    }, 15_000);

    async function restore(conversationId: string): Promise<void> {
      try {
        const request: BrowserRecall = {
          conversation_id: conversationId,
          browser_flow_id: crypto.randomUUID(),
        };
        const response = await fetch(
          assistantDestination(gateway, "conversations/recall"),
          {
            method: "POST",
            credentials: "omit",
            cache: "no-store",
            referrerPolicy: "no-referrer",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              baggage: "app_id=public-api-docs,caller=docs-assistant",
            },
            body: JSON.stringify(request),
          },
        );
        if (controller.signal.aborted) return;
        if (response.status === 404) {
          if (readConversation(storage, gateway) === conversationId)
            saveConversation(storage, gateway, null);
        } else {
          if (!response.ok) throw new Error("Recall unavailable");
          const value: unknown = await response.json();
          const recalled = parseRecall(value);
          if (controller.signal.aborted) return;
          if (recalled.conversation_id !== conversationId)
            throw new Error("Recall identity mismatch");
          onRecall(recalled);
        }
        setStatus(RecallStatus.Ready);
      } catch {
        if (!controller.signal.aborted) setStatus(RecallStatus.Failed);
      } finally {
        clearTimeout(timeout);
      }
    }
    void restore(conversation);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [gateway, onRecall, attempt]);

  return {
    status,
    retry: () => {
      setStatus(RecallStatus.Loading);
      setAttempt((current) => current + 1);
    },
    reset: () => setStatus(RecallStatus.Ready),
  };
}
