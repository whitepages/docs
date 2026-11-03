import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AssistantAnswer } from "../components/docs-assistant/answer";
import { AssistantWelcome } from "../components/docs-assistant/welcome";
import {
  AssistantActivity,
  AssistantEventType,
  assistantActivityLabel,
  pageContext,
  parseCatalog,
  parseEvent,
  parseRecall,
} from "./docs-assistant";
import { readEvents } from "./docs-assistant-stream";

const conversation = "a899c12d-3e77-4faa-8cce-79bf57761ccd";
const request = "341d824e-f8b0-429f-b0c6-800048e6d433";

function response(chunks: string[]) {
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks)
          controller.enqueue(new TextEncoder().encode(chunk));
        controller.close();
      },
    }),
  );
}

describe("documentation assistant boundary", () => {
  it("uses published page identity rather than guessing IDs", () => {
    const documents = parseCatalog({
      version: 1,
      documents: [{ id: "canonical-id", page_url: "/docs/references/page" }],
    });
    expect(
      pageContext(
        "https://api.whitepages.com/docs/references/page?key=do-not-forward#fragment",
        documents,
      ),
    ).toEqual({
      path: "/docs/references/page",
      expected_page_url: "https://api.whitepages.com/docs/references/page",
      doc_id: "canonical-id",
    });
    expect(
      pageContext("https://api.whitepages.com/docs/missing", documents).doc_id,
    ).toBeNull();
    expect(() =>
      parseCatalog({
        version: 1,
        documents: [{ id: "x", page_url: "https://untrusted.invalid" }],
      }),
    ).toThrow();
  });
  it("parses fragmented SSE without exposing unrecognized protocol events", async () => {
    const received: unknown[] = [];
    await readEvents(
      response([
        ": keepalive\r",
        '\n\r\ndata: {"type":"assistant_text","content":"hello"}\n',
        `\ndata: {"type":"completed","conversation_id":"${conversation}","request_id":"${request}"}\n\n`,
      ]),
      (event) => received.push(event),
    );
    expect(received).toEqual([
      { type: "assistant_text", content: "hello" },
      { type: "completed", conversation_id: conversation, request_id: request },
    ]);
    expect(() =>
      parseEvent({ type: "reasoning", content: "hidden" }),
    ).toThrow();
    expect(() => parseEvent({ type: "tool_call", arguments: {} })).toThrow();
  });
  it("keeps named event kinds and activities compatible with the public wire values", () => {
    const events = [
      { type: "assistant_text", content: "hello" },
      { type: "activity", activity: "thinking" },
      { type: "completed", conversation_id: conversation, request_id: request },
      { type: "failed", reason: "interrupted", correlation_id: request },
    ];
    expect(events.map((event) => parseEvent(event).type)).toEqual([
      AssistantEventType.AssistantText,
      AssistantEventType.Activity,
      AssistantEventType.Completed,
      AssistantEventType.Failed,
    ]);
    expect(assistantActivityLabel(AssistantActivity.Thinking)).toBe(
      "Thinking…",
    );
    expect(
      assistantActivityLabel(AssistantActivity.ReferencingDocumentation),
    ).toBe("Referencing documentation…");
  });
  it("requires exactly one terminal outcome and rejects partial or oversized streams", async () => {
    await expect(
      readEvents(
        response(['data: {"type":"assistant_text","content":"partial"}\n\n']),
        () => {},
      ),
    ).rejects.toThrow("interrupted");
    const terminal = `data: {"type":"failed","reason":"interrupted","correlation_id":"${request}"}\n\n`;
    await expect(
      readEvents(response([terminal, terminal]), () => {}),
    ).rejects.toThrow("after completion");
    await expect(
      readEvents(response(["x".repeat(1_048_577)]), () => {}),
    ).rejects.toThrow("limit");
  });
  it("accepts only the visible recall projection", () => {
    expect(
      parseRecall({
        conversation_id: conversation,
        records: [
          {
            id: request,
            role: "customer",
            content: "hello",
            created_at: "2026-11-03T12:00:00Z",
          },
        ],
        interrupted: false,
      }).records[0].content,
    ).toBe("hello");
    expect(() =>
      parseRecall({
        conversation_id: "id",
        records: [
          {
            id: "record",
            role: "system",
            content: "hidden",
            created_at: "now",
          },
        ],
        interrupted: false,
      }),
    ).toThrow();
  });
  it("welcomes customers as Doc with API-first starters, not a product-selection pitch or fabricated history", () => {
    const html = renderToStaticMarkup(
      createElement(AssistantWelcome, { onSelect: () => {} }),
    );
    expect(html).toContain("Hi, I’m Doc.");
    expect(html).toContain("How do I get started with the API?");
    expect(html).toContain("How do I authenticate an API request?");
    expect(html).toContain("How can I contact API support?");
    expect(html).toContain("using the Whitepages API.");
    expect(html).not.toContain("finding the right product");
    expect(html).not.toContain("Which Whitepages product");
    expect(html.match(/<button/g)).toHaveLength(3);
    expect(html).not.toContain("docs-assistant-customer");
    expect(html).not.toContain("docs-assistant-assistant");
  });
  it("renders untrusted markdown without HTML, scripts, or executable link schemes", () => {
    const html = renderToStaticMarkup(
      createElement(AssistantAnswer, {
        content:
          "<script>alert(1)</script>\n\n[unsafe](javascript:alert(1))\n\n![tracking](https://untrusted.invalid/pixel)\n\n[safe](/docs/references/page)",
      }),
    );
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="/docs/references/page"');
  });
});
