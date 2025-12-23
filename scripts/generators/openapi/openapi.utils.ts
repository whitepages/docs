import type { OpenAPISpec, TagGroup } from "./openapi.types";

// Tags to exclude from automatic generation (deprecated APIs)
const DEPRECATED_TAGS = ["Property"];

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function tagToDirectoryName(tagName: string): string {
  return tagName.toLowerCase().replace(/\s+/g, "-");
}

function createTagGroupsFromSpec(spec: OpenAPISpec): Map<string, TagGroup> {
  const tagGroups = new Map<string, TagGroup>();

  for (const tag of spec.tags ?? []) {
    if (DEPRECATED_TAGS.includes(tag.name)) {
      continue;
    }

    tagGroups.set(tag.name, {
      name: tag.name,
      description: tag.description ?? "",
      routes: [],
    });
  }

  return tagGroups;
}

function addRoutesToTagGroups(
  spec: OpenAPISpec,
  tagGroups: Map<string, TagGroup>,
): void {
  for (const [, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (method === "parameters") continue;

      const tagName = operation.tags?.[0] ?? "default";

      if (DEPRECATED_TAGS.includes(tagName)) {
        continue;
      }

      const operationId = operation.operationId ?? `${method}_${tagName}`;

      if (!tagGroups.has(tagName)) {
        tagGroups.set(tagName, { name: tagName, description: "", routes: [] });
      }

      const directoryName = tagToDirectoryName(tagName);

      tagGroups.get(tagName)!.routes.push({
        title: operation.summary ?? operationId,
        description: operation.description?.split("\n")[0] ?? "",
        href: `/references/${directoryName}/${slugify(operationId)}`,
      });
    }
  }
}

export function extractTagGroups(spec: OpenAPISpec): TagGroup[] {
  const tagGroups = createTagGroupsFromSpec(spec);
  addRoutesToTagGroups(spec, tagGroups);

  return Array.from(tagGroups.values())
    .filter((tag) => tag.routes.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}
