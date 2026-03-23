import type { OpenAPISpec, TagGroup } from "./openapi.types";

export const DEPRECATED_TAGS = ["Property", "Person"];

const TAG_DISPLAY_NAMES: Record<string, string> = {
  "Person V2": "Person",
  "Property V2": "Property",
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function tagToDirectoryName(tagName: string): string {
  return tagName.toLowerCase().replace(/\s+/g, "-");
}

export function tagToDisplayName(tagName: string): string {
  return TAG_DISPLAY_NAMES[tagName] ?? tagName;
}

function createTagGroupsFromSpec(
  openApiSpec: OpenAPISpec,
): Map<string, TagGroup> {
  const tagGroups = new Map<string, TagGroup>();

  for (const tag of openApiSpec.tags ?? []) {
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
  openApiSpec: OpenAPISpec,
  tagGroups: Map<string, TagGroup>,
): void {
  for (const methods of Object.values(openApiSpec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (method === "parameters") continue;

      const tagName = operation.tags?.[0] ?? "default";

      if (DEPRECATED_TAGS.includes(tagName)) {
        continue;
      }

      const operationId = operation.operationId ?? `${method}_${tagName}`;
      const existingGroup = tagGroups.get(tagName);
      const tagGroup = existingGroup ?? {
        name: tagName,
        description: "",
        routes: [],
      };

      if (!existingGroup) {
        tagGroups.set(tagName, tagGroup);
      }

      const directoryName = tagToDirectoryName(tagName);

      tagGroup.routes.push({
        title: operation.summary ?? operationId,
        description: operation.description?.split("\n")[0] ?? "",
        href: `/references/${directoryName}/${slugify(operationId)}`,
      });
    }
  }
}

export function extractTagGroups(openApiSpec: OpenAPISpec): TagGroup[] {
  const tagGroups = createTagGroupsFromSpec(openApiSpec);
  addRoutesToTagGroups(openApiSpec, tagGroups);

  return Array.from(tagGroups.values())
    .filter((tag) => tag.routes.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}
