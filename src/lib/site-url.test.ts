import { describe, expect, test } from "bun:test";
import {
  SITE_BASE_URL,
  absoluteDocsUrl,
  absolutizeRootRelativeLinks,
} from "./site-url";

describe("absoluteDocsUrl", () => {
  test("prefixes a page path with the docs base path", () => {
    expect(absoluteDocsUrl("/documentation/mcp")).toBe(
      "https://api.whitepages.com/docs/documentation/mcp",
    );
  });

  test("emits the index page without a trailing slash", () => {
    expect(absoluteDocsUrl("/")).toBe("https://api.whitepages.com/docs");
  });
});

describe("absolutizeRootRelativeLinks", () => {
  test("rewrites a root-relative markdown target", () => {
    expect(
      absolutizeRootRelativeLinks(
        "See [MCP Server](/documentation/mcp) for details.",
      ),
    ).toBe(`See [MCP Server](${SITE_BASE_URL}/documentation/mcp) for details.`);
  });

  test("rewrites a root-relative html href", () => {
    expect(
      absolutizeRootRelativeLinks('<a href="/references/billing">Billing</a>'),
    ).toBe(`<a href="${SITE_BASE_URL}/references/billing">Billing</a>`);
  });

  test("keeps the fragment when a target carries one", () => {
    expect(
      absolutizeRootRelativeLinks("[Limits](/references/rate-limits#monthly)"),
    ).toBe(`[Limits](${SITE_BASE_URL}/references/rate-limits#monthly)`);
  });

  test("rewrites every occurrence, not just the first", () => {
    const result = absolutizeRootRelativeLinks(
      '[A](/a) and [B](/b) and <a href="/c">C</a>',
    );

    expect(result).toBe(
      `[A](${SITE_BASE_URL}/a) and [B](${SITE_BASE_URL}/b) and <a href="${SITE_BASE_URL}/c">C</a>`,
    );
  });

  test("leaves an already-absolute target untouched", () => {
    const text = "[Whitepages](https://www.whitepages.com/about)";

    expect(absolutizeRootRelativeLinks(text)).toBe(text);
  });

  test("leaves a protocol-relative target untouched", () => {
    const text =
      '[CDN](//cdn.example.com/a) <a href="//cdn.example.com/b">b</a>';

    expect(absolutizeRootRelativeLinks(text)).toBe(text);
  });

  test("leaves a bare fragment and a mailto target untouched", () => {
    const text = "[Top](#overview) and [Support](mailto:api@whitepages.com)";

    expect(absolutizeRootRelativeLinks(text)).toBe(text);
  });

  test("leaves prose containing a slash alone", () => {
    const text = "Rates are measured in requests/second (see the table).";

    expect(absolutizeRootRelativeLinks(text)).toBe(text);
  });
});
