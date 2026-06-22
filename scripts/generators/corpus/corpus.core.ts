import { parse as parseYaml } from "yaml";
import type {
  Catalog,
  CatalogEntry,
  Lifecycle,
  ParsedDoc,
  Topic,
} from "./corpus.types";

export const CATALOG_VERSION = 1;
export const RESERVED_IDS: readonly string[] = ["everything", "openapi"];

const TOPICS = new Set<string>([
  "person",
  "property",
  "deed-events",
  "webhooks",
  "account-billing",
  "getting-started",
]);

function isTopic(value: unknown): value is Topic {
  return typeof value === "string" && TOPICS.has(value);
}

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n?/;
const IMPORT_EXPORT_LINE =
  /^\s*(?:import|export)\s.+\sfrom\s+["'][^"']+["'];?\s*$/;

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
  return slug === "" ? "index" : slug.replaceAll("/", "_");
}

export function cleanBody(body: string): string {
  return body
    .split("\n")
    .filter((line) => !IMPORT_EXPORT_LINE.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function toBody(title: string, rawBody: string): string {
  return `# ${title}\n\n${cleanBody(rawBody)}\n`;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

export function toCatalogEntry(
  id: string,
  data: Record<string, unknown>,
): CatalogEntry {
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
    description: asString(data.description, ""),
    lifecycle,
    topic: isTopic(data.topic) ? data.topic : null,
    keywords,
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
  const { data, body } = splitFrontmatter(raw);
  const id = deriveId(fileToSlug(relativePath));
  const entry = toCatalogEntry(id, data);

  return { id, entry, body: toBody(entry.title, body) };
}
