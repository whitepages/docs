// The Organization and WebAPI nodes are sitewide entities: their `@id` and
// field values must be byte-identical across all 62 pages, so they're fixed
// constants rather than derived per request. Redefining either differently
// per page would tell a parser the entity is unstable, which is worse than
// omitting the node.
export const ORGANIZATION_ID = "https://www.whitepages.com/#organization";
export const WEBAPI_ID = "https://api.whitepages.com/#pro-api";

const organizationNode = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: "Whitepages",
  url: "https://www.whitepages.com/",
};

const webApiNode = {
  "@type": "WebAPI",
  "@id": WEBAPI_ID,
  name: "Whitepages Pro API",
  // Matches the visible description on /documentation/getting-started, the
  // page that most directly represents the product as a whole.
  description: "Get started with the Whitepages Pro API",
  provider: { "@id": ORGANIZATION_ID },
  documentation: "https://api.whitepages.com/docs",
  termsOfService: "https://www.whitepages.com/terms",
};

export interface BreadcrumbEntry {
  name: string;
  url?: string;
}

export interface StructuredDataPage {
  url: string;
  title: string;
  description?: string;
}

export function buildStructuredData(
  page: StructuredDataPage,
  breadcrumb: BreadcrumbEntry[],
) {
  const graph: Record<string, unknown>[] = [
    organizationNode,
    webApiNode,
    {
      "@type": "TechArticle",
      "@id": `${page.url}#article`,
      headline: page.title,
      ...(page.description ? { description: page.description } : {}),
      isPartOf: { "@id": WEBAPI_ID },
      publisher: { "@id": ORGANIZATION_ID },
    },
  ];

  if (breadcrumb.length > 0) {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: breadcrumb.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        ...(item.url ? { item: item.url } : {}),
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

// A page title or description containing "</script>" would otherwise close
// the tag this JSON is embedded in early. `<` never appears unescaped in
// valid JSON, so replacing it is safe for any input.
export function toScriptSafeJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
