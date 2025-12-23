import type { RouteInfo, TagGroup } from "./openapi.types";

function generateCardMarkdown(route: RouteInfo): string {
  const escapedDescription = route.description.replace(/"/g, '\\"');
  return `  <Card
    title="${route.title}"
    description="${escapedDescription}"
    href="${route.href}"
  />`;
}

function generateSectionMarkdown(group: TagGroup): string {
  const cards = group.routes.map(generateCardMarkdown).join("\n");

  return `## ${group.name} API

${group.description}

<Cards>
${cards}
</Cards>`;
}

export function generateRoutesPageMarkdown(tagGroups: TagGroup[]): string {
  const sections = tagGroups.map(generateSectionMarkdown).join("\n\n");

  return `---
title: Routes
description: Complete overview of all available Whitepages API endpoints organized by category.
icon: Route
---

import { Cards, Card } from "fumadocs-ui/components/card";

The Whitepages API provides comprehensive access to person and property data with enterprise-grade authentication and usage tracking.

Before using the API, review the [Authentication](/references/authentication), [Rate Limits](/references/rate-limits), and [Billing](/references/billing) documentation.

${sections}
`;
}
