import { describe, expect, test } from "bun:test";
import {
  ORGANIZATION_ID,
  WEBAPI_ID,
  buildStructuredData,
  toScriptSafeJson,
} from "./structured-data";

const page = {
  url: "https://api.whitepages.com/docs/documentation/getting-started",
  title: "Getting Started",
  description: "Get started with the Whitepages Pro API",
};

describe("buildStructuredData", () => {
  test("emits byte-identical Organization and WebAPI nodes regardless of page", () => {
    const a = buildStructuredData(page, []);
    const b = buildStructuredData(
      {
        ...page,
        url: "https://api.whitepages.com/docs/changelog",
        title: "Changelog",
      },
      [],
    );

    expect(a["@graph"][0]).toEqual(b["@graph"][0]);
    expect(a["@graph"][1]).toEqual(b["@graph"][1]);
  });

  test("ties the TechArticle node to the page via @id, isPartOf, and publisher", () => {
    const data = buildStructuredData(page, []);
    const techArticle = data["@graph"][2] as Record<string, unknown>;

    expect(techArticle["@type"]).toBe("TechArticle");
    expect(techArticle["@id"]).toBe(`${page.url}#article`);
    expect(techArticle.headline).toBe(page.title);
    expect(techArticle.description).toBe(page.description);
    expect(techArticle.isPartOf).toEqual({ "@id": WEBAPI_ID });
    expect(techArticle.publisher).toEqual({ "@id": ORGANIZATION_ID });
  });

  test("omits the description field when the page has none", () => {
    const data = buildStructuredData({ ...page, description: undefined }, []);
    const techArticle = data["@graph"][2] as Record<string, unknown>;

    expect("description" in techArticle).toBe(false);
  });

  test("omits BreadcrumbList when there is nothing to show, matching the visible breadcrumb", () => {
    const data = buildStructuredData(page, []);

    expect(data["@graph"]).toHaveLength(3);
  });

  test("renders BreadcrumbList items in order with absolute URLs", () => {
    const data = buildStructuredData(page, [
      {
        name: "Person Search API",
        url: "https://api.whitepages.com/docs/documentation/person-search",
      },
    ]);
    const breadcrumb = data["@graph"][3] as Record<string, unknown>;

    expect(breadcrumb["@type"]).toBe("BreadcrumbList");
    expect(breadcrumb.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "Person Search API",
        item: "https://api.whitepages.com/docs/documentation/person-search",
      },
    ]);
  });
});

describe("toScriptSafeJson", () => {
  test("escapes a closing script tag embedded in a field value", () => {
    const json = toScriptSafeJson({ headline: "</script><script>alert(1)" });

    expect(json).not.toContain("</script>");
    expect(JSON.parse(json.replace(/\\u003c/g, "<"))).toEqual({
      headline: "</script><script>alert(1)",
    });
  });
});
