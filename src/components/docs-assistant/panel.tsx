"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
} from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, MessageCircle, Plus, Send } from "lucide-react";
import { AssistantAnswer } from "./answer";
import { AssistantRestoration } from "./restoration";
import { docsAssistantConfig } from "@/lib/docs-assistant-config";
import { useConversationRecall } from "./use-recall";
import {
  browserConversationStorage,
  saveConversation,
} from "@/lib/docs-assistant-storage";
import amplitude from "@/lib/amplitude";
import { DOCS_BASE_PATH } from "@/lib/docs-prefix.mjs";
import {
  assistantDestination,
  assistantActivityLabel,
  AssistantActivity,
  AssistantEventType,
  RecallStatus,
  unexpectedAssistantState,
  pageContext,
  parseCatalog,
  parseRecall,
  type BrowserTurn,
  type DocumentIdentity,
} from "@/lib/docs-assistant";
import { readEvents } from "@/lib/docs-assistant-stream";

interface Bubble {
  id: string;
  role: "customer" | "assistant";
  content: string;
}

export function DocsAssistant(): JSX.Element | null {
  if (!docsAssistantConfig.enabled) return null;
  return (
    <Suspense fallback={null}>
      <Preview gateway={docsAssistantConfig.gateway} />
    </Suspense>
  );
}

function Preview({ gateway }: { gateway: string }): JSX.Element | null {
  const search = useSearchParams();
  return search.get("docChat") === "1" ? <Panel gateway={gateway} /> : null;
}

function analyticsAssociation(): BrowserTurn["analytics"] {
  try {
    const session = amplitude.getSessionId();
    return {
      amplitude_user_id: amplitude.getUserId() ?? null,
      amplitude_session_id: session === undefined ? null : String(session),
    };
  } catch {
    return { amplitude_user_id: null, amplitude_session_id: null };
  }
}

function Panel({ gateway }: { gateway: string }): JSX.Element {
  const [opened, setOpened] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [conversation, setConversation] = useState<string | null>(null);
  const [flow, setFlow] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [activityLabel, setActivityLabel] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [documents, setDocuments] = useState<readonly DocumentIdentity[]>([]);
  const [contextUnavailable, setContextUnavailable] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const remember = useCallback(
    (id: string) => {
      setConversation(id);
      setStorageUnavailable(
        !saveConversation(browserConversationStorage(), gateway, id),
      );
    },
    [gateway],
  );
  const applyRecall = useCallback(
    (recalled: ReturnType<typeof parseRecall>) => {
      remember(recalled.conversation_id);
      setBubbles(
        recalled.records.map(({ id, role, content }) => ({
          id,
          role,
          content,
        })),
      );
      setFailure(
        recalled.interrupted
          ? "The previous response was interrupted. Start a new conversation if it cannot continue."
          : null,
      );
    },
    [remember],
  );
  const restoration = useConversationRecall(gateway, applyRecall);
  const canSend = !busy && restoration.status === RecallStatus.Ready;
  const active = useRef<AbortController | null>(null);
  const transcript = useRef<HTMLDivElement | null>(null);
  const composer = useRef<HTMLTextAreaElement | null>(null);
  const launcher = useRef<HTMLButtonElement | null>(null);
  const following = useRef(true);

  useEffect(() => {
    if (opened && restoration.status === RecallStatus.Ready)
      composer.current?.focus();
  }, [opened, restoration.status]);

  useEffect(() => {
    const element = transcript.current;
    if (element && following.current) element.scrollTop = element.scrollHeight;
  }, [bubbles, activityLabel, failure, opened]);

  function minimize(): void {
    setOpened(false);
    launcher.current?.focus();
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${DOCS_BASE_PATH}/assistant-catalog.json`, {
      signal: controller.signal,
      credentials: "omit",
    })
      .then((response) => {
        if (!response.ok) throw new Error("Document catalog unavailable");
        return response.json();
      })
      .then((value: unknown) => setDocuments(parseCatalog(value)))
      .catch(() => {
        if (!controller.signal.aborted) setContextUnavailable(true);
      });
    return () => {
      controller.abort();
      active.current?.abort();
    };
  }, []);

  async function submit(literalMessage: string): Promise<void> {
    if (!canSend || !literalMessage.trim()) return;
    const request = crypto.randomUUID();
    const browserFlow = flow ?? crypto.randomUUID();
    setFlow(browserFlow);
    const controller = new AbortController();
    active.current = controller;
    following.current = true;
    setDraftMessage("");
    setFailure(null);
    setBusy(true);
    setActivityLabel(assistantActivityLabel(AssistantActivity.Thinking));
    setBubbles((current) => [
      ...current,
      { id: `${request}-customer`, role: "customer", content: literalMessage },
      { id: request, role: "assistant", content: "" },
    ]);
    try {
      const address = assistantDestination(gateway, "turns");
      const turn: BrowserTurn = {
        request_id: request,
        browser_flow_id: browserFlow,
        conversation_id: conversation,
        message: literalMessage,
        page: pageContext(window.location.href, documents),
        analytics: analyticsAssociation(),
      };
      const response = await fetch(address, {
        method: "POST",
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          baggage: "app_id=public-api-docs,caller=docs-assistant",
        },
        body: JSON.stringify(turn),
      });
      if (!response.ok) throw new Error("Assistant unavailable");
      if (response.headers.get("Content-Type")?.includes("application/json")) {
        const value: unknown = await response.json();
        const recalled = parseRecall(value);
        applyRecall(recalled);
      } else {
        await readEvents(response, (event) => {
          switch (event.type) {
            case AssistantEventType.AssistantText:
              setBubbles((current) =>
                current.map((bubble) =>
                  bubble.id === request
                    ? { ...bubble, content: bubble.content + event.content }
                    : bubble,
                ),
              );
              return;
            case AssistantEventType.Activity:
              setActivityLabel(assistantActivityLabel(event.activity));
              return;
            case AssistantEventType.Completed:
              remember(event.conversation_id);
              return;
            case AssistantEventType.Failed:
              setFailure(
                "The assistant could not complete this response. Your previous messages may be retained; do not treat the partial answer as complete.",
              );
              return;
            default:
              return unexpectedAssistantState(event);
          }
        });
      }
    } catch {
      setFailure(
        "The assistant response was interrupted or unavailable. The documentation and manual examples still work.",
      );
    } finally {
      setBusy(false);
      setActivityLabel("");
      active.current = null;
    }
  }

  function newConversation(): void {
    if (busy || restoration.status === RecallStatus.Loading) return;
    setStorageUnavailable(
      !saveConversation(browserConversationStorage(), gateway, null),
    );
    restoration.reset();
    setConversation(null);
    setFlow(crypto.randomUUID());
    setBubbles([]);
    setFailure(null);
    setDraftMessage("");
    following.current = true;
    composer.current?.focus();
  }

  return (
    <>
      <button
        ref={launcher}
        type="button"
        style={{
          bottom: "calc(var(--cookie-consent-height, 0px) + 1.25rem)",
        }}
        className="fixed right-5 z-50 grid size-14 place-items-center rounded-full bg-fd-primary text-fd-primary-foreground shadow-lg transition-colors hover:bg-fd-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fd-ring"
        data-testid="docs-assistant-open"
        aria-label={opened ? "Minimize Doc" : "Ask Doc"}
        aria-expanded={opened}
        aria-controls={opened ? "docs-assistant-panel" : undefined}
        aria-haspopup="dialog"
        onClick={() => (opened ? minimize() : setOpened(true))}
      >
        {opened ? (
          <ChevronDown className="size-6" aria-hidden="true" />
        ) : (
          <MessageCircle className="size-6" aria-hidden="true" />
        )}
      </button>
      {opened && (
        <section
          id="docs-assistant-panel"
          data-testid="docs-assistant-panel"
          role="dialog"
          aria-labelledby="docs-assistant-title"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              minimize();
            }
          }}
          style={{
            bottom: "calc(var(--cookie-consent-height, 0px) + 5.5rem)",
            height:
              "min(70dvh, 38rem, calc(100dvh - var(--cookie-consent-height, 0px) - 6.5rem))",
          }}
          className="fixed right-3 z-50 flex w-[min(calc(100vw-1.5rem),25rem)] flex-col overflow-hidden rounded-2xl border bg-fd-card text-fd-foreground shadow-2xl"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <h2 id="docs-assistant-title" className="font-semibold">
                Doc
              </h2>
              <p className="text-xs text-fd-muted-foreground">
                Whitepages documentation assistant
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                data-testid="docs-assistant-new"
                type="button"
                aria-label="Start a new conversation"
                title="New conversation"
                disabled={busy || restoration.status === RecallStatus.Loading}
                onClick={newConversation}
                className="grid size-9 place-items-center rounded-lg text-fd-muted-foreground hover:bg-fd-muted hover:text-fd-foreground focus-visible:outline-2 focus-visible:outline-fd-ring disabled:opacity-50"
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                data-testid="docs-assistant-dismiss"
                aria-label="Minimize Doc"
                title="Minimize"
                onClick={minimize}
                className="grid size-9 place-items-center rounded-lg text-fd-muted-foreground hover:bg-fd-muted hover:text-fd-foreground focus-visible:outline-2 focus-visible:outline-fd-ring"
              >
                <ChevronDown className="size-4" aria-hidden="true" />
              </button>
            </div>
          </header>
          {contextUnavailable && (
            <p className="px-4 pt-3 text-xs text-fd-muted-foreground">
              Page identification is unavailable. Mention the page in your
              question.
            </p>
          )}
          <div
            ref={transcript}
            data-testid="docs-assistant-transcript"
            aria-live="polite"
            onScroll={(event) => {
              const element = event.currentTarget;
              following.current =
                element.scrollHeight -
                  element.scrollTop -
                  element.clientHeight <
                48;
            }}
            className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4"
          >
            <AssistantRestoration
              status={restoration.status}
              empty={bubbles.length === 0}
              onRetry={restoration.retry}
              onSelect={(question) => void submit(question)}
            />
            {bubbles.map((bubble) => (
              <article
                data-testid={`docs-assistant-${bubble.role}`}
                key={bubble.id}
                className={
                  bubble.role === "customer"
                    ? "ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md bg-fd-accent px-3 py-2 text-fd-accent-foreground"
                    : "min-w-0"
                }
              >
                <span className="mb-1 block text-xs font-medium text-fd-muted-foreground">
                  {bubble.role === "customer" ? "You" : "Doc"}
                </span>
                {bubble.role === "customer" ? (
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {bubble.content}
                  </p>
                ) : (
                  <div className="prose prose-sm max-w-none break-words dark:prose-invert [&_pre]:max-w-full [&_pre]:overflow-x-auto">
                    <AssistantAnswer content={bubble.content} />
                  </div>
                )}
              </article>
            ))}
            {busy && (
              <p
                data-testid="docs-assistant-activity"
                role="status"
                className="text-sm text-fd-muted-foreground"
              >
                {activityLabel}
              </p>
            )}
            {failure && (
              <p
                role="alert"
                data-testid="docs-assistant-failure"
                className="rounded-lg border border-red-500 p-3 text-sm"
              >
                {failure}
              </p>
            )}
          </div>
          <form
            className="shrink-0 px-3 pb-3 pt-2"
            onSubmit={(event) => {
              event.preventDefault();
              void submit(draftMessage);
            }}
          >
            <div className="flex items-end gap-2 rounded-xl border bg-fd-background p-2 focus-within:ring-2 focus-within:ring-fd-ring">
              <label className="sr-only" htmlFor="docs-assistant-question">
                Message Doc
              </label>
              <textarea
                ref={composer}
                data-testid="docs-assistant-question"
                id="docs-assistant-question"
                value={draftMessage}
                disabled={!canSend}
                maxLength={8192}
                onChange={(event) => setDraftMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={2}
                className="min-w-0 flex-1 resize-none bg-transparent px-1 py-1 text-sm outline-none placeholder:text-fd-muted-foreground"
                placeholder="What can I help you with?"
              />
              <button
                data-testid="docs-assistant-send"
                type="submit"
                aria-label="Send message"
                disabled={!canSend || !draftMessage.trim()}
                className="grid size-9 shrink-0 place-items-center rounded-lg bg-fd-primary text-fd-primary-foreground hover:bg-fd-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-ring disabled:opacity-50"
              >
                <Send className="size-4" aria-hidden="true" />
              </button>
            </div>
            <p className="px-1 pt-2 text-center text-xs text-fd-muted-foreground">
              Doc can be mistaken. Check the linked documentation.
            </p>
            {storageUnavailable && (
              <p
                role="status"
                data-testid="docs-assistant-storage-unavailable"
                className="pt-1 text-center text-xs text-fd-muted-foreground"
              >
                This browser can’t remember chat changes after you leave this
                page.
              </p>
            )}
          </form>
        </section>
      )}
    </>
  );
}
