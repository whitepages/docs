import type { JSX } from "react";
import { RecallStatus, unexpectedAssistantState } from "@/lib/docs-assistant";
import { AssistantWelcome } from "./welcome";

export function AssistantRestoration({
  status,
  empty,
  onRetry,
  onSelect,
}: {
  readonly status: RecallStatus;
  readonly empty: boolean;
  readonly onRetry: () => void;
  readonly onSelect: (question: string) => void;
}): JSX.Element | null {
  switch (status) {
    case RecallStatus.Loading:
      return (
        <p
          role="status"
          data-testid="docs-assistant-restoring"
          className="text-sm text-fd-muted-foreground"
        >
          Restoring your conversation…
        </p>
      );
    case RecallStatus.Failed:
      return (
        <div role="alert" className="space-y-2 text-sm">
          <p>
            Your saved conversation couldn’t be loaded. Try again or start a new
            conversation.
          </p>
          <button
            type="button"
            data-testid="docs-assistant-restore-retry"
            onClick={onRetry}
            className="rounded-lg border px-3 py-2 hover:bg-fd-muted"
          >
            Try again
          </button>
        </div>
      );
    case RecallStatus.Ready:
      if (!empty) return null;
      return <AssistantWelcome onSelect={onSelect} />;
    default:
      return unexpectedAssistantState(status);
  }
}
