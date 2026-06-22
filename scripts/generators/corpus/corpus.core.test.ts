import { describe, expect, test } from "bun:test";
import {
  assertCorpusInvariants,
  buildCatalog,
  cleanBody,
  deriveId,
  fileToSlug,
  parseDoc,
  serializeCatalog,
  splitFrontmatter,
  toBody,
  toCatalogEntry,
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

  test("flattens slashes into underscores", () => {
    expect(deriveId("references/versioning/breaking-changes-policy")).toBe(
      "references_versioning_breaking-changes-policy",
    );
  });
});

describe("cleanBody", () => {
  test("strips ESM import and export lines", () => {
    const body =
      'import { Callout } from "fumadocs-ui/components/callout";\n\ntext';
    expect(cleanBody(body)).toBe("text");
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
});

describe("toCatalogEntry", () => {
  test("applies defaults for missing facets", () => {
    expect(toCatalogEntry("x", { title: "X" })).toEqual({
      id: "x",
      title: "X",
      description: "",
      lifecycle: "current",
      topic: null,
      keywords: [],
    });
  });

  test("reads deprecated lifecycle, topic, and string keywords", () => {
    const entry = toCatalogEntry("x", {
      title: "X",
      description: "d",
      lifecycle: "deprecated",
      topic: "person",
      keywords: ["a", 1, "b"],
    });

    expect(entry.lifecycle).toBe("deprecated");
    expect(entry.topic).toBe("person");
    expect(entry.keywords).toEqual(["a", "b"]);
  });

  test("falls back to the id when title is missing", () => {
    expect(toCatalogEntry("the-id", {}).title).toBe("the-id");
  });

  test("rejects an unknown topic", () => {
    expect(
      toCatalogEntry("x", { title: "X", topic: "not-a-topic" }).topic,
    ).toBe(null);
  });
});

describe("parseDoc", () => {
  test("parses raw MDX into id, catalog entry, and body", () => {
    const raw =
      "---\ntitle: Rate Limits\ntopic: account-billing\n---\n\nBody text.";
    const doc = parseDoc("references/rate-limits.mdx", raw);

    expect(doc.id).toBe("references_rate-limits");
    expect(doc.entry.title).toBe("Rate Limits");
    expect(doc.entry.topic).toBe("account-billing");
    expect(doc.body).toBe("# Rate Limits\n\nBody text.\n");
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
  test("sorts docs by id and sets the version", () => {
    const catalog = buildCatalog(
      [
        toCatalogEntry("b", { title: "B" }),
        toCatalogEntry("a", { title: "A" }),
      ],
      1,
    );

    expect(catalog.version).toBe(1);
    expect(catalog.docs.map((doc) => doc.id)).toEqual(["a", "b"]);
  });
});

describe("serializeCatalog", () => {
  test("produces indented JSON with a trailing newline", () => {
    const out = serializeCatalog({ version: 1, docs: [] });
    expect(out).toBe('{\n  "version": 1,\n  "docs": []\n}\n');
  });
});
