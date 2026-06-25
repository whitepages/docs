import { describe, expect, test } from "bun:test";
import { injectFacets, resolveFacets } from "./openapi.facets";

describe("resolveFacets", () => {
  test("maps the person-v2 directory to the person topic", () => {
    const facets = resolveFacets(
      "person-v2/search_person_by_name_phone_or_address_v2.mdx",
    );

    expect(facets.topic).toBe("person");
    expect(facets.lifecycle).toBe("current");
    expect(facets.keywords).toContain("reverse phone lookup");
  });

  test("maps the property-v2 directory to the property topic", () => {
    expect(resolveFacets("property-v2/search_property_v2.mdx").topic).toBe(
      "property",
    );
  });

  test("maps the account directory to the account-billing topic", () => {
    expect(resolveFacets("account/get_account_usage_data.mdx").topic).toBe(
      "account-billing",
    );
  });

  test("leaves topic undefined for an unmapped directory", () => {
    const facets = resolveFacets("regions/list_states.mdx");

    expect(facets.topic).toBeUndefined();
    expect(facets.keywords).toEqual(["list states", "supported states"]);
  });

  test("returns empty keywords for an unknown file in a mapped directory", () => {
    const facets = resolveFacets("person-v2/unknown_endpoint.mdx");

    expect(facets.topic).toBe("person");
    expect(facets.keywords).toEqual([]);
    expect(facets.related).toEqual([]);
  });

  test("resolves curated related URLs for a known endpoint", () => {
    const facets = resolveFacets("person-v2/get_person_by_id_v2.mdx");

    expect(facets.related).toContain(
      "/references/person-v2/search_person_by_name_phone_or_address_v2",
    );
  });
});

describe("injectFacets", () => {
  const sample = "---\ntitle: X\ndescription: Y\n---\n\nbody";

  test("inserts facets after the opening delimiter, before existing keys", () => {
    const out = injectFacets(sample, {
      lifecycle: "current",
      topic: "person",
      keywords: ["a", "b"],
      related: [],
    });

    expect(out).toBe(
      '---\nlifecycle: current\ntopic: person\nkeywords:\n  - "a"\n  - "b"\ntitle: X\ndescription: Y\n---\n\nbody',
    );
  });

  test("emits the related block first, with unquoted URLs", () => {
    const out = injectFacets(sample, {
      lifecycle: "current",
      keywords: [],
      related: ["/references/billing", "/references/rate-limits"],
    });

    expect(out).toBe(
      "---\nrelated:\n  - /references/billing\n  - /references/rate-limits\nlifecycle: current\ntitle: X\ndescription: Y\n---\n\nbody",
    );
  });

  test("omits the topic line when topic is undefined", () => {
    const out = injectFacets(sample, {
      lifecycle: "current",
      keywords: ["a"],
      related: [],
    });

    expect(out).not.toContain("topic:");
    expect(out).toContain("lifecycle: current");
  });

  test("omits the keywords block when there are no keywords", () => {
    const out = injectFacets(sample, {
      lifecycle: "current",
      topic: "person",
      keywords: [],
      related: [],
    });

    expect(out).not.toContain("keywords:");
  });

  test("omits the related block when there are no related ids", () => {
    const out = injectFacets(sample, {
      lifecycle: "current",
      keywords: [],
      related: [],
    });

    expect(out).not.toContain("related:");
  });

  test("quotes keywords so reserved characters stay valid YAML", () => {
    const out = injectFacets(sample, {
      lifecycle: "current",
      keywords: ["who owns this: property"],
      related: [],
    });

    expect(out).toContain('  - "who owns this: property"');
  });

  test("preserves existing frontmatter and body", () => {
    const out = injectFacets(sample, {
      lifecycle: "current",
      keywords: [],
      related: [],
    });

    expect(out).toContain("title: X");
    expect(out).toContain("description: Y");
    expect(out.endsWith("body")).toBe(true);
  });

  test("returns content unchanged when there is no frontmatter", () => {
    const noFrontmatter = "no frontmatter here";

    expect(
      injectFacets(noFrontmatter, {
        lifecycle: "current",
        keywords: ["a"],
        related: [],
      }),
    ).toBe(noFrontmatter);
  });
});
