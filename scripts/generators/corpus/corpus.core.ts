import { parse as parseYaml } from "yaml";
import type {
  Catalog,
  CatalogEntry,
  DocKind,
  EndpointFacet,
  Lifecycle,
  ParsedDoc,
  Topic,
} from "./corpus.types";

export const CATALOG_VERSION = 2;
export const RESERVED_IDS: readonly string[] = ["everything", "openapi"];
export const NAV_SHELL_SLUGS: readonly string[] = [
  "",
  "references",
  "documentation/guides",
];

const DESCRIPTION_MAX_LENGTH = 200;

const TOPICS = new Set<string>([
  "person",
  "property",
  "deed-events",
  "webhooks",
  "account-billing",
  "getting-started",
  "regions",
  "versioning",
]);

function isTopic(value: unknown): value is Topic {
  return typeof value === "string" && TOPICS.has(value);
}

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n?/;
const IMPORT_EXPORT_LINE =
  /^\s*(?:import|export)\s.+\sfrom\s+["'][^"']+["'];?\s*$/;
const MDX_COMMENT = /\{\/\*[\s\S]*?\*\/\}/g;
const API_PAGE_BLOCK = /<APIPage[\s\S]*?\/>/g;
const API_PAGE_OPERATION =
  /path:\s*["']([^"']+)["']\s*,\s*method:\s*["']([^"']+)["']/;
const MARKDOWN_LINK = /\]\((\/[^)\s]+)\)/g;
const JSX_HREF = /href=(\{?)["'](\/[^"'\s]+)["'](\}?)/g;

export function splitFrontmatter(raw: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const match = raw.match(FRONTMATTER_PATTERN);

  if (!match) {
    return { data: {}, body: raw };
  }

  const parsed = parseYaml(match[1]) as unknown;
  const data =
    parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};

  return { data, body: raw.slice(match[0].length) };
}

export function fileToSlug(relativePath: string): string {
  const withoutExtension = relativePath.replace(/\.mdx$/, "");

  if (withoutExtension === "index") {
    return "";
  }

  return withoutExtension.replace(/\/index$/, "");
}

export function deriveId(slug: string): string {
  return slug === "" ? "index" : slug.replaceAll("/", "-").replaceAll("_", "-");
}

export function isNavShell(slug: string): boolean {
  return NAV_SHELL_SLUGS.includes(slug);
}

export function hasApiPage(rawBody: string): boolean {
  return /<APIPage[\s>]/.test(rawBody);
}

export function cleanBody(body: string): string {
  return body
    .replace(MDX_COMMENT, "")
    .replace(API_PAGE_BLOCK, "")
    .split("\n")
    .filter((line) => !IMPORT_EXPORT_LINE.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function toBody(title: string, cleanedBody: string): string {
  return cleanedBody ? `# ${title}\n\n${cleanedBody}\n` : `# ${title}\n`;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

export function summarize(text: string): string {
  const firstParagraph = text.split(/\n\s*\n/)[0] ?? "";
  const collapsed = firstParagraph.replace(/\s+/g, " ").trim();

  if (collapsed.length <= DESCRIPTION_MAX_LENGTH) {
    return collapsed;
  }

  const sentence = collapsed.match(/^.*?[.!?](?=\s|$)/)?.[0]?.trim();

  if (sentence && sentence.length <= DESCRIPTION_MAX_LENGTH) {
    return sentence;
  }

  return `${collapsed.slice(0, DESCRIPTION_MAX_LENGTH - 1).trimEnd()}…`;
}

export function deriveDescription(
  data: Record<string, unknown>,
  cleanedBody: string,
): string {
  const explicit =
    asString(data.description, "").trim() || asString(data.summary, "").trim();
  const bodyText = cleanedBody.replace(/^#\s.*\n+/, "");
  return summarize(explicit || bodyText);
}

export function topicForPath(slug: string): Topic | null {
  if (
    slug.startsWith("documentation/person-search") ||
    slug.startsWith("references/person-v2") ||
    slug.includes("person-v1-to-v2")
  ) {
    return "person";
  }

  if (
    slug.startsWith("documentation/property-search") ||
    slug.startsWith("references/property-v2") ||
    slug.includes("property-v1-to-v2")
  ) {
    return "property";
  }

  if (
    slug.startsWith("documentation/events") ||
    slug.startsWith("references/events")
  ) {
    return "deed-events";
  }

  if (
    slug.startsWith("documentation/webhooks") ||
    slug.startsWith("references/webhooks")
  ) {
    return "webhooks";
  }

  if (
    slug === "documentation/regions" ||
    slug.startsWith("references/regions")
  ) {
    return "regions";
  }

  if (
    slug === "changelog" ||
    slug.startsWith("references/versioning") ||
    slug.startsWith("references/migration")
  ) {
    return "versioning";
  }

  if (
    slug === "documentation/purchasing-api" ||
    slug.startsWith("references/")
  ) {
    return "account-billing";
  }

  if (slug.startsWith("documentation/")) {
    return "getting-started";
  }

  return null;
}

export function deriveKind(slug: string, isEndpoint: boolean): DocKind {
  if (isEndpoint) {
    return "endpoint";
  }

  return slug.startsWith("references/") ? "reference" : "guide";
}

export function parseEndpoint(slug: string, rawBody: string): EndpointFacet {
  const match = rawBody.match(API_PAGE_OPERATION);

  if (!match) {
    throw new Error(
      `Endpoint doc "${slug}" has an <APIPage> with no parseable operation`,
    );
  }

  const operationId = slug.split("/").pop() ?? slug;
  return { operationId, path: match[1], method: match[2].toLowerCase() };
}

export function resolveInternalPath(
  target: string,
  slugToId: ReadonlyMap<string, string>,
): string | null {
  const withoutAnchor = target.split("#")[0] ?? "";

  if (!withoutAnchor.startsWith("/")) {
    return null;
  }

  const slug = withoutAnchor.replace(/^\/+/, "").replace(/\/+$/, "");
  return slugToId.get(slug) ?? null;
}

export function rewriteBody(
  body: string,
  slugToId: ReadonlyMap<string, string>,
  selfId: string,
): { body: string; edges: readonly string[] } {
  const edges = new Set<string>();

  const rewriteTarget = (target: string): string | null => {
    const id = resolveInternalPath(target, slugToId);

    if (id === null || id === selfId) {
      return null;
    }

    edges.add(id);
    return `doc_id:${id}`;
  };

  const withMarkdown = body.replace(MARKDOWN_LINK, (whole, target: string) => {
    const docId = rewriteTarget(target);
    return docId ? `](${docId})` : whole;
  });

  const rewritten = withMarkdown.replace(
    JSX_HREF,
    (whole, open: string, target: string, close: string) => {
      const docId = rewriteTarget(target);
      return docId ? `href=${open}"${docId}"${close}` : whole;
    },
  );

  return { body: rewritten, edges: [...edges].sort() };
}

export function parseRelated(data: Record<string, unknown>): readonly string[] {
  return Array.isArray(data.related)
    ? data.related.filter((entry): entry is string => typeof entry === "string")
    : [];
}

export function resolveRelated(
  docId: string,
  relatedPaths: readonly string[],
  slugToId: ReadonlyMap<string, string>,
): readonly string[] {
  const seen = new Set<string>();

  for (const path of relatedPaths) {
    const id = resolveInternalPath(path, slugToId);

    if (id === null) {
      throw new Error(`Doc "${docId}" relates to unresolvable path "${path}"`);
    }

    if (id === docId) {
      throw new Error(`Doc "${docId}" lists itself in related`);
    }

    seen.add(id);
  }

  return [...seen];
}

export function renderRelated(
  items: readonly { id: string; title: string }[],
): string {
  if (items.length === 0) {
    return "";
  }

  const links = items.map((item) => `- [${item.title}](doc_id:${item.id})`);
  return `## Related\n\n${links.join("\n")}`;
}

export function withRelated(body: string, section: string): string {
  return section ? `${body.trimEnd()}\n\n${section}\n` : body;
}

export function toCatalogEntry(input: {
  id: string;
  slug: string;
  data: Record<string, unknown>;
  cleanedBody: string;
  rawBody: string;
  isEndpoint: boolean;
}): CatalogEntry {
  const { id, slug, data, cleanedBody, rawBody, isEndpoint } = input;

  const lifecycle: Lifecycle =
    data.lifecycle === "deprecated" ? "deprecated" : "current";

  const keywords = Array.isArray(data.keywords)
    ? data.keywords.filter(
        (entry): entry is string => typeof entry === "string",
      )
    : [];

  return {
    id,
    title: asString(data.title, id),
    description: deriveDescription(data, cleanedBody),
    kind: deriveKind(slug, isEndpoint),
    lifecycle,
    topic: isTopic(data.topic) ? data.topic : topicForPath(slug),
    keywords,
    edges: [],
    endpoint: isEndpoint ? parseEndpoint(slug, rawBody) : null,
  };
}

export function assertCorpusInvariants(ids: readonly string[]): void {
  const seen = new Set<string>();

  for (const id of ids) {
    if (RESERVED_IDS.includes(id)) {
      throw new Error(`Document id "${id}" collides with a reserved id`);
    }

    if (seen.has(id)) {
      throw new Error(`Duplicate document id "${id}"`);
    }

    seen.add(id);
  }
}

export function buildCatalog(
  entries: readonly CatalogEntry[],
  version: number = CATALOG_VERSION,
): Catalog {
  const docs = [...entries].sort((a, b) => a.id.localeCompare(b.id));
  return { version, docs };
}

export function serializeCatalog(catalog: Catalog): string {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

export function parseDoc(relativePath: string, raw: string): ParsedDoc {
  const { data, body: rawBody } = splitFrontmatter(raw);
  const slug = fileToSlug(relativePath);
  const id = deriveId(slug);
  const isEndpoint = hasApiPage(rawBody);
  const cleanedBody = cleanBody(rawBody);
  const entry = toCatalogEntry({
    id,
    slug,
    data,
    cleanedBody,
    rawBody,
    isEndpoint,
  });

  return {
    id,
    slug,
    entry,
    body: toBody(entry.title, cleanedBody),
    related: parseRelated(data),
  };
}
