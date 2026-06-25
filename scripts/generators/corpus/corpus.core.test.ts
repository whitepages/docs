import { describe, expect, test } from "bun:test";
import {
  assertCorpusInvariants,
  buildCatalog,
  cleanBody,
  deriveDescription,
  deriveId,
  deriveKind,
  fileToSlug,
  hasApiPage,
  isNavShell,
  parseDoc,
  parseEndpoint,
  parseRelated,
  renderRelated,
  resolveInternalPath,
  resolveRelated,
  rewriteBody,
  serializeCatalog,
  splitFrontmatter,
  summarize,
  toBody,
  toCatalogEntry,
  topicForPath,
  withRelated,
} from "./corpus.core";

describe("splitFrontmatter", () => {
  test("parses YAML frontmatter and returns the remaining body", () => {
    const raw = "---\ntitle: X\nlifecycle: current\n---\n\nbody text";
    const { data, body } = splitFrontmatter(raw);

    expect(data).toEqual({ title: "X", lifecycle: "current" });
    expect(body).toBe("\nbody text");
  });

  test("returns empty data and the full content when there is no frontmatter", () => {
    const raw = "# Heading\n\nno frontmatter";
    expect(splitFrontmatter(raw)).toEqual({ data: {}, body: raw });
  });
});

describe("fileToSlug", () => {
  test("maps the root index to an empty slug", () => {
    expect(fileToSlug("index.mdx")).toBe("");
  });

  test("drops the extension for a leaf page", () => {
    expect(fileToSlug("references/rate-limits.mdx")).toBe(
      "references/rate-limits",
    );
  });

  test("drops a trailing index segment", () => {
    expect(fileToSlug("documentation/person-search/index.mdx")).toBe(
      "documentation/person-search",
    );
  });
});

describe("deriveId", () => {
  test("maps the empty slug to index", () => {
    expect(deriveId("")).toBe("index");
  });

  test("normalizes both slashes and underscores to dashes", () => {
    expect(deriveId("references/account/get_account_usage_data")).toBe(
      "references-account-get-account-usage-data",
    );
  });

  test("leaves an already-dashed slug untouched", () => {
    expect(deriveId("references/person-v2")).toBe("references-person-v2");
  });
});

describe("isNavShell", () => {
  test.each([
    ["", true],
    ["references", true],
    ["documentation/guides", true],
    ["documentation/person-search", false],
    ["references/authentication", false],
  ])("isNavShell(%p) === %p", (slug, expected) => {
    expect(isNavShell(slug)).toBe(expected);
  });
});

describe("hasApiPage", () => {
  test("detects an APIPage block", () => {
    expect(hasApiPage("text\n<APIPage\n  document={}\n/>")).toBe(true);
  });

  test("ignores prose mentioning the word", () => {
    expect(hasApiPage("The APIPageView component is unrelated.")).toBe(false);
  });
});

describe("cleanBody", () => {
  test("strips ESM import and export lines", () => {
    const body =
      'import { Callout } from "fumadocs-ui/components/callout";\n\ntext';
    expect(cleanBody(body)).toBe("text");
  });

  test("strips MDX comments", () => {
    const body = "{/* This file was generated. Do not edit. */}\n\ntext";
    expect(cleanBody(body)).toBe("text");
  });

  test("strips a self-closing APIPage block", () => {
    const body =
      '<APIPage\n  document={"x"}\n  operations={[{ path: "/v2/person/", method: "get" }]}\n/>';
    expect(cleanBody(body)).toBe("");
  });

  test("keeps prose that merely mentions import and from", () => {
    const body = "You can import records from your account.";
    expect(cleanBody(body)).toBe(body);
  });

  test("collapses runs of blank lines and trims", () => {
    expect(cleanBody("\n\na\n\n\n\nb\n\n")).toBe("a\n\nb");
  });
});

describe("toBody", () => {
  test("prepends the title as an H1 and ends with a newline", () => {
    expect(toBody("Title", "content")).toBe("# Title\n\ncontent\n");
  });

  test("emits a title-only body when the content is empty", () => {
    expect(toBody("Title", "")).toBe("# Title\n");
  });
});

describe("summarize", () => {
  test("returns a short single sentence unchanged", () => {
    expect(summarize("Retrieve person information.")).toBe(
      "Retrieve person information.",
    );
  });

  test("collapses whitespace and keeps the first paragraph", () => {
    expect(summarize("First   line.\n\nSecond paragraph.")).toBe("First line.");
  });

  test("reduces a long paragraph to its first sentence", () => {
    const long = `${"a".repeat(10)}. ${"b".repeat(250)}`;
    expect(summarize(long)).toBe(`${"a".repeat(10)}.`);
  });

  test("hard-truncates when even the first sentence is too long", () => {
    const result = summarize("x".repeat(400));
    expect(result.length).toBe(200);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("deriveDescription", () => {
  test("prefers the frontmatter description", () => {
    expect(
      deriveDescription({ description: "From frontmatter." }, "body"),
    ).toBe("From frontmatter.");
  });

  test("falls back to summary then to the body lead", () => {
    expect(deriveDescription({ summary: "From summary." }, "body")).toBe(
      "From summary.",
    );
    expect(deriveDescription({}, "Lead sentence. More.")).toBe(
      "Lead sentence. More.",
    );
  });

  test("ignores the H1 heading when reading the body lead", () => {
    expect(deriveDescription({}, "# Title\n\nReal lead.")).toBe("Real lead.");
  });
});

describe("topicForPath", () => {
  test.each([
    ["documentation/events/event-payload", "deed-events"],
    ["references/events/search_deed_events", "deed-events"],
    ["documentation/webhooks/create-webhook", "webhooks"],
    ["references/regions/list_states", "regions"],
    ["documentation/regions", "regions"],
    ["references/versioning/breaking-changes-policy", "versioning"],
    ["references/migration/person-v1-to-v2", "person"],
    ["changelog", "versioning"],
    ["documentation/purchasing-api", "account-billing"],
    ["references/support-and-incident-response", "account-billing"],
    ["documentation/getting-started", "getting-started"],
    ["references/person-v2/get_person_by_id_v2", "person"],
  ])("topicForPath(%p) === %p", (slug, expected) => {
    expect(topicForPath(slug)).toBe(expected);
  });

  test("returns null for an uncategorized slug", () => {
    expect(topicForPath("some-other-root")).toBe(null);
  });
});

describe("deriveKind", () => {
  test("endpoint when an APIPage is present", () => {
    expect(deriveKind("references/person-v2/get_person_by_id_v2", true)).toBe(
      "endpoint",
    );
  });

  test("reference for non-endpoint pages under references", () => {
    expect(deriveKind("references/authentication", false)).toBe("reference");
  });

  test("guide for everything else", () => {
    expect(deriveKind("documentation/getting-started", false)).toBe("guide");
  });
});

describe("parseEndpoint", () => {
  test("derives the operationId from the slug and path/method from the body", () => {
    const body =
      '<APIPage\n  document={"x"}\n  operations={[{ path: "/v2/person/{id}", method: "GET" }]}\n/>';
    expect(
      parseEndpoint("references/person-v2/get_person_by_id_v2", body),
    ).toEqual({
      operationId: "get_person_by_id_v2",
      path: "/v2/person/{id}",
      method: "get",
    });
  });

  test("throws when the operation cannot be parsed", () => {
    expect(() => parseEndpoint("references/x", "<APIPage />")).toThrow(
      /no parseable operation/,
    );
  });
});

describe("resolveInternalPath", () => {
  const slugToId = new Map([
    ["references/authentication", "references-authentication"],
    ["documentation/person-search", "documentation-person-search"],
  ]);

  test("resolves an internal path to a known id, ignoring anchors", () => {
    expect(
      resolveInternalPath("/references/authentication#keys", slugToId),
    ).toBe("references-authentication");
  });

  test("returns null for external links", () => {
    expect(resolveInternalPath("https://example.com", slugToId)).toBe(null);
  });

  test("returns null for an internal path with no matching doc", () => {
    expect(resolveInternalPath("/references", slugToId)).toBe(null);
  });
});

describe("rewriteBody", () => {
  const slugToId = new Map([
    ["references/billing", "references-billing"],
    ["documentation/person-search", "documentation-person-search"],
  ]);

  test("rewrites markdown links and collects sorted unique edges", () => {
    const body =
      "See [billing](/references/billing) and [people](/documentation/person-search) and [again](/references/billing).";
    const { body: rewritten, edges } = rewriteBody(body, slugToId, "self");

    expect(rewritten).toContain("[billing](doc_id:references-billing)");
    expect(rewritten).toContain("[people](doc_id:documentation-person-search)");
    expect(edges).toEqual([
      "documentation-person-search",
      "references-billing",
    ]);
  });

  test("rewrites JSX href attributes, including the braced form", () => {
    const body =
      '<Card href="/references/billing" /><Card href={"/references/billing"} />';
    const { body: rewritten, edges } = rewriteBody(body, slugToId, "self");

    expect(rewritten).toContain('href="doc_id:references-billing"');
    expect(rewritten).toContain('href={"doc_id:references-billing"}');
    expect(edges).toEqual(["references-billing"]);
  });

  test("leaves links to dropped or unknown targets untouched", () => {
    const body = "See [routes](/references) and [ext](https://x.com).";
    const { body: rewritten, edges } = rewriteBody(body, slugToId, "self");

    expect(rewritten).toBe(body);
    expect(edges).toEqual([]);
  });

  test("does not create a self-edge", () => {
    const body = "[here](/references/billing)";
    const { edges } = rewriteBody(body, slugToId, "references-billing");

    expect(edges).toEqual([]);
  });
});

describe("parseRelated", () => {
  test("reads a string list and ignores non-strings", () => {
    expect(
      parseRelated({
        related: ["/references/billing", 1, "/references/rate-limits"],
      }),
    ).toEqual(["/references/billing", "/references/rate-limits"]);
  });

  test("returns an empty list when related is absent", () => {
    expect(parseRelated({})).toEqual([]);
  });
});

describe("resolveRelated", () => {
  const slugToId = new Map([
    ["references/billing", "references-billing"],
    ["references/rate-limits", "references-rate-limits"],
  ]);

  test("resolves related URLs to deduplicated doc ids", () => {
    expect(
      resolveRelated(
        "self",
        [
          "/references/billing",
          "/references/rate-limits",
          "/references/billing",
        ],
        slugToId,
      ),
    ).toEqual(["references-billing", "references-rate-limits"]);
  });

  test("throws on an unresolvable path", () => {
    expect(() =>
      resolveRelated("self", ["/references/nope"], slugToId),
    ).toThrow(/unresolvable path/);
  });

  test("throws when a doc relates to itself", () => {
    expect(() =>
      resolveRelated("references-billing", ["/references/billing"], slugToId),
    ).toThrow(/itself/);
  });
});

describe("renderRelated", () => {
  test("renders a Related section of doc_id links", () => {
    expect(
      renderRelated([
        { id: "references-billing", title: "Billing" },
        { id: "references-rate-limits", title: "Rate Limits" },
      ]),
    ).toBe(
      "## Related\n\n- [Billing](doc_id:references-billing)\n- [Rate Limits](doc_id:references-rate-limits)",
    );
  });

  test("renders nothing for an empty list", () => {
    expect(renderRelated([])).toBe("");
  });
});

describe("withRelated", () => {
  test("appends the section with a blank-line separator", () => {
    expect(withRelated("# Title\n", "## Related\n\n- x")).toBe(
      "# Title\n\n## Related\n\n- x\n",
    );
  });

  test("returns the body unchanged when there is no section", () => {
    expect(withRelated("# Title\n", "")).toBe("# Title\n");
  });
});

describe("toCatalogEntry", () => {
  test("builds a guide entry with derived facets and defaults", () => {
    const entry = toCatalogEntry({
      id: "documentation-getting-started",
      slug: "documentation/getting-started",
      data: { title: "Getting Started", description: "Get started." },
      cleanedBody: "Get started.",
      rawBody: "Get started.",
      isEndpoint: false,
    });

    expect(entry).toEqual({
      id: "documentation-getting-started",
      title: "Getting Started",
      description: "Get started.",
      kind: "guide",
      lifecycle: "current",
      topic: "getting-started",
      keywords: [],
      edges: [],
      endpoint: null,
    });
  });

  test("builds an endpoint entry with the endpoint facet", () => {
    const rawBody =
      '<APIPage operations={[{ path: "/v2/person/", method: "get" }]} />';
    const entry = toCatalogEntry({
      id: "references-person-v2-search-person",
      slug: "references/person-v2/search_person",
      data: { title: "Search", description: "Find a person." },
      cleanedBody: "",
      rawBody,
      isEndpoint: true,
    });

    expect(entry.kind).toBe("endpoint");
    expect(entry.topic).toBe("person");
    expect(entry.endpoint).toEqual({
      operationId: "search_person",
      path: "/v2/person/",
      method: "get",
    });
  });

  test("reads deprecated lifecycle and string keywords, frontmatter topic wins", () => {
    const entry = toCatalogEntry({
      id: "x",
      slug: "documentation/agentic-guidance/entity-shapes",
      data: {
        title: "X",
        description: "d",
        lifecycle: "deprecated",
        topic: "person",
        keywords: ["a", 1, "b"],
      },
      cleanedBody: "d",
      rawBody: "d",
      isEndpoint: false,
    });

    expect(entry.lifecycle).toBe("deprecated");
    expect(entry.topic).toBe("person");
    expect(entry.keywords).toEqual(["a", "b"]);
  });

  test("rejects an unknown topic and falls back to the path", () => {
    const entry = toCatalogEntry({
      id: "x",
      slug: "references/authentication",
      data: { title: "X", topic: "not-a-topic" },
      cleanedBody: "body",
      rawBody: "body",
      isEndpoint: false,
    });

    expect(entry.topic).toBe("account-billing");
  });

  test("falls back to the id when title is missing", () => {
    const entry = toCatalogEntry({
      id: "the-id",
      slug: "the-id",
      data: {},
      cleanedBody: "",
      rawBody: "",
      isEndpoint: false,
    });

    expect(entry.title).toBe("the-id");
  });
});

describe("parseDoc", () => {
  test("parses a guide into id, slug, catalog entry, and body", () => {
    const raw =
      "---\ntitle: Rate Limits\ntopic: account-billing\n---\n\nBody text.";
    const doc = parseDoc("references/rate-limits.mdx", raw);

    expect(doc.id).toBe("references-rate-limits");
    expect(doc.slug).toBe("references/rate-limits");
    expect(doc.entry.kind).toBe("reference");
    expect(doc.entry.topic).toBe("account-billing");
    expect(doc.body).toBe("# Rate Limits\n\nBody text.\n");
  });

  test("strips the APIPage body but keeps the endpoint facet", () => {
    const raw = `---
title: Search
description: Find a person.
---

{/* generated */}

<APIPage
  document={"x"}
  operations={[{ path: "/v2/person/", method: "get" }]}
/>`;
    const doc = parseDoc(
      "references/person-v2/search_person_by_name_phone_or_address_v2.mdx",
      raw,
    );

    expect(doc.body).toBe("# Search\n");
    expect(doc.entry.endpoint).toEqual({
      operationId: "search_person_by_name_phone_or_address_v2",
      path: "/v2/person/",
      method: "get",
    });
  });

  test("extracts related URLs from frontmatter", () => {
    const raw =
      "---\ntitle: X\nrelated:\n  - /references/billing\n  - /references/rate-limits\n---\n\nBody.";
    const doc = parseDoc("references/x.mdx", raw);

    expect(doc.related).toEqual([
      "/references/billing",
      "/references/rate-limits",
    ]);
  });
});

describe("assertCorpusInvariants", () => {
  test("passes for unique non-reserved ids", () => {
    expect(() => assertCorpusInvariants(["a", "b"])).not.toThrow();
  });

  test("throws on a reserved id", () => {
    expect(() => assertCorpusInvariants(["a", "openapi"])).toThrow(/reserved/);
  });

  test("throws on a duplicate id", () => {
    expect(() => assertCorpusInvariants(["a", "a"])).toThrow(/Duplicate/);
  });
});

describe("buildCatalog", () => {
  const entry = (id: string) =>
    toCatalogEntry({
      id,
      slug: id,
      data: { title: id.toUpperCase() },
      cleanedBody: "",
      rawBody: "",
      isEndpoint: false,
    });

  test("sorts docs by id and sets the version", () => {
    const catalog = buildCatalog([entry("b"), entry("a")], 2);

    expect(catalog.version).toBe(2);
    expect(catalog.docs.map((doc) => doc.id)).toEqual(["a", "b"]);
  });
});

describe("serializeCatalog", () => {
  test("produces indented JSON with a trailing newline", () => {
    const out = serializeCatalog({ version: 2, docs: [] });
    expect(out).toBe('{\n  "version": 2,\n  "docs": []\n}\n');
  });
});
