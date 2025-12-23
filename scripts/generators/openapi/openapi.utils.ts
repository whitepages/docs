import type { OpenAPISpec, TagGroup } from "./openapi.types";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function createTagGroupsFromSpec(spec: OpenAPISpec): Map<string, TagGroup> {
  const tagGroups = new Map<string, TagGroup>();

  for (const tag of spec.tags ?? []) {
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
      const operationId = operation.operationId ?? `${method}_${tagName}`;

      if (!tagGroups.has(tagName)) {
        tagGroups.set(tagName, { name: tagName, description: "", routes: [] });
      }

      // Convert tag name to URL-safe format: "Property V2" -> "property-v2"
      const urlSafeTag = tagName.toLowerCase().replace(/\s+/g, "-");

      tagGroups.get(tagName)!.routes.push({
        title: operation.summary ?? operationId,
        description: operation.description?.split("\n")[0] ?? "",
        href: `/references/${urlSafeTag}/${slugify(operationId)}`,
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
