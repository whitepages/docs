import { expect, it } from "bun:test";
import { buildCatalog, parseDoc } from "./corpus.core";
import { pageContext, parseCatalog } from "../../../src/lib/docs-assistant";
import { DOCS_BASE_PATH } from "../../../src/lib/docs-prefix.mjs";

it("publishes one canonical document-to-page mapping shared with browser context", () => {
  const document = parseDoc(
    "references/some_endpoint.mdx",
    "---\ntitle: Endpoint\n---\n\nPublished documentation.",
  );
  const catalog = buildCatalog([document.entry]);
  expect(catalog.version).toBe(4);
  expect(document.entry.page_url).toBe(
    `${DOCS_BASE_PATH}/references/some_endpoint`,
  );
  const browser = parseCatalog({
    version: 1,
    documents: catalog.docs.map((entry) => ({
      id: entry.id,
      page_url: entry.page_url,
    })),
  });
  const context = pageContext(
    `https://api.whitepages.com${document.entry.page_url}?input=ignored#fragment`,
    browser,
  );
  expect(context.doc_id).toBe(document.id);
  expect(context.path).toBe(document.entry.page_url);
  expect(context.expected_page_url).not.toContain(
    `${DOCS_BASE_PATH}${DOCS_BASE_PATH}`,
  );
  expect(
    pageContext("https://api.whitepages.com/docs/not-in-corpus", browser)
      .doc_id,
  ).toBeNull();
});
