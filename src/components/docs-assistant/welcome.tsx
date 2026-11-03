import type { JSX } from "react";

const starters = [
  {
    id: "getting-started",
    question: "How do I get started with the API?",
  },
  {
    id: "authentication",
    question: "How do I authenticate an API request?",
  },
  {
    id: "contact",
    question: "How can I contact API support?",
  },
] as const;

export function AssistantWelcome({
  onSelect,
}: {
  readonly onSelect: (question: string) => void;
}): JSX.Element {
  return (
    <div data-testid="docs-assistant-welcome" className="space-y-5 py-2">
      <div className="space-y-2 text-sm">
        <p className="font-medium">Hi, I’m Doc.</p>
        <p className="text-fd-muted-foreground">
          Ask me about getting started, authentication, or using the Whitepages
          API.
        </p>
      </div>
      <div className="flex flex-col items-start gap-2">
        {starters.map(({ id, question }) => (
          <button
            key={id}
            type="button"
            data-testid={`docs-assistant-starter-${id}`}
            onClick={() => onSelect(question)}
            className="rounded-xl border px-3 py-2 text-left text-sm transition-colors hover:bg-fd-muted focus-visible:outline-2 focus-visible:outline-fd-ring"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
