import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RecallStatus } from "@/lib/docs-assistant";
import { AssistantRestoration } from "./restoration";

function render(status: RecallStatus, empty = true): string {
  return renderToStaticMarkup(
    createElement(AssistantRestoration, {
      status,
      empty,
      onRetry: () => {},
      onSelect: () => {},
    }),
  );
}

describe("conversation restoration presentation", () => {
  it("shows loading rather than a welcome or retry control", () => {
    const html = render(RecallStatus.Loading);
    expect(html).toContain("docs-assistant-restoring");
    expect(html).not.toContain("docs-assistant-welcome");
    expect(html).not.toContain("docs-assistant-restore-retry");
  });

  it("offers retry for a failed restoration", () => {
    const html = render(RecallStatus.Failed);
    expect(html).toContain("docs-assistant-restore-retry");
    expect(html).not.toContain("docs-assistant-welcome");
    expect(html).not.toContain("docs-assistant-restoring");
  });

  it("welcomes an empty ready conversation", () => {
    expect(render(RecallStatus.Ready)).toContain("docs-assistant-welcome");
  });

  it("does not repeat the welcome for a ready conversation with history", () => {
    expect(render(RecallStatus.Ready, false)).toBe("");
  });
});
