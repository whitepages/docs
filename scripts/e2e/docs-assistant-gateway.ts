import assert from "node:assert/strict";
import {
  BrowserRecallSchema,
  BrowserTurnSchema,
  type AssistantEvent,
  type BrowserRecall,
  type BrowserTurn,
  type DocumentIdentity,
  type VisibleRecord,
} from "../../src/lib/docs-assistant";

interface GatewayFixture {
  readonly server: Bun.Server<undefined>;
  readonly conversation: string;
  readonly turns: BrowserTurn[];
  readonly recalls: BrowserRecall[];
  readonly latestConversation: () => string;
  readonly setRecallStatus: (status: number) => void;
}

function record(role: VisibleRecord["role"], content: string): VisibleRecord {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    created_at: new Date().toISOString(),
  };
}

function streamed(
  events: readonly AssistantEvent[],
  headers: Readonly<Record<string, string>>,
): Response {
  return new Response(
    new ReadableStream({
      async start(controller) {
        for (const event of events) {
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`),
          );
          await Bun.sleep(150);
        }
        controller.close();
      },
    }),
    { headers: { ...headers, "Content-Type": "text/event-stream" } },
  );
}

export function createGatewayFixture(
  origin: string,
  document: DocumentIdentity,
): GatewayFixture {
  const conversation = crypto.randomUUID();
  let latest = conversation;
  let recallStatus = 200;
  const histories = new Map<string, readonly VisibleRecord[]>();
  const turns: BrowserTurn[] = [];
  const recalls: BrowserRecall[] = [];
  const headers = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, accept, baggage",
    "Cache-Control": "no-store",
  };
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      if (request.method === "OPTIONS")
        return new Response(null, { status: 204, headers });
      for (const name of ["authorization", "x-api-key", "cookie"])
        assert(!request.headers.has(name));
      const path = new URL(request.url).pathname;
      const body: unknown = await request.json();
      if (
        request.method === "POST" &&
        path === "/api/v1/docs-assistant/conversations/recall"
      ) {
        const recall = BrowserRecallSchema.parse(body);
        recalls.push(recall);
        const records = histories.get(recall.conversation_id);
        if (recallStatus !== 200 || !records)
          return Response.json(
            { error: "conversation_unavailable" },
            { status: recallStatus === 200 ? 404 : recallStatus, headers },
          );
        return Response.json(
          {
            conversation_id: recall.conversation_id,
            records,
            interrupted: false,
          },
          { headers },
        );
      }
      if (request.method !== "POST" || path !== "/api/v1/docs-assistant/turns")
        return new Response(null, { status: 404, headers });
      const turn = BrowserTurnSchema.parse(body);
      turns.push(turn);
      if (turn.message === "Simulate an unavailable assistant")
        return streamed(
          [
            { type: "activity", activity: "thinking" },
            {
              type: "failed",
              reason: "upstream_unavailable",
              correlation_id: crypto.randomUUID(),
            },
          ],
          headers,
        );
      latest =
        turn.conversation_id ??
        (histories.size === 0 ? conversation : crypto.randomUUID());
      if (turn.conversation_id !== null && !histories.has(latest))
        return Response.json(
          { error: "conversation_not_found" },
          { status: 404, headers },
        );
      const opening =
        turn.conversation_id === null ? "Checking the published page. " : "";
      const answer =
        turn.message === "How can I contact sales instead?"
          ? "Find contact options in the API support documentation."
          : `Read the [phone documentation](${document.page_url}).`;
      histories.set(latest, [
        ...(histories.get(latest) ?? []),
        record("customer", turn.message),
        record("assistant", opening + answer),
      ]);
      return streamed(
        [
          { type: "activity", activity: "thinking" },
          { type: "assistant_text", content: opening },
          { type: "activity", activity: "referencing_documentation" },
          { type: "assistant_text", content: answer },
          {
            type: "completed",
            conversation_id: latest,
            request_id: turn.request_id,
          },
        ],
        headers,
      );
    },
  });
  return {
    server,
    conversation,
    turns,
    recalls,
    latestConversation: () => latest,
    setRecallStatus: (status) => {
      recallStatus = status;
    },
  };
}
