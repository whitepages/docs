import type { Lifecycle, Topic } from "../../../src/lib/facets";

export interface Facets {
  lifecycle: Lifecycle;
  topic?: Topic;
  keywords: string[];
  related: string[];
}

const DIRECTORY_TOPICS: Record<string, Topic> = {
  "person-v2": "person",
  "property-v2": "property",
  events: "deed-events",
  webhooks: "webhooks",
  account: "account-billing",
};

const FILE_KEYWORDS: Record<string, string[]> = {
  "person-v2/search_person_by_name_phone_or_address_v2.mdx": [
    "reverse phone lookup",
    "phone search",
    "who lives at this address",
    "people search",
    "name lookup",
    "address lookup",
    "find a person",
  ],
  "person-v2/get_person_by_id_v2.mdx": [
    "person by id",
    "person details",
    "hydrate person",
  ],
  "property-v2/search_property_v2.mdx": [
    "who owns this property",
    "property owner",
    "property search",
    "ownership info",
    "residents at an address",
  ],
  "property-v2/get_property_by_id_v2.mdx": [
    "property by id",
    "property details",
  ],
  "events/search_deed_events.mdx": [
    "deed events",
    "property transactions",
    "title changes",
  ],
  "events/search_events.mdx": ["search events", "event query"],
  "events/get_event.mdx": ["event by id", "event details"],
  "webhooks/create_webhook.mdx": [
    "create webhook",
    "subscribe to events",
    "register webhook",
  ],
  "webhooks/delete_webhook.mdx": [
    "delete webhook",
    "remove webhook subscription",
  ],
  "webhooks/get_webhook.mdx": ["webhook details", "get webhook"],
  "webhooks/list_webhooks.mdx": ["list webhooks", "webhook subscriptions"],
  "webhooks/test_webhook.mdx": ["test webhook", "send test event"],
  "webhooks/update_webhook.mdx": [
    "update webhook",
    "modify webhook subscription",
  ],
  "account/get_account_usage_data.mdx": [
    "account usage",
    "usage data",
    "remaining quota",
    "how many queries left",
    "query count",
  ],
  "regions/list_states.mdx": ["list states", "supported states"],
  "regions/list_counties.mdx": ["list counties", "counties by state"],
};

const FILE_RELATED: Record<string, string[]> = {
  "person-v2/search_person_by_name_phone_or_address_v2.mdx": [
    "/documentation/person-search",
    "/documentation/agentic-guidance/capability-map",
    "/references/person-v2/get_person_by_id_v2",
    "/references/authentication",
    "/references/rate-limits",
  ],
  "person-v2/get_person_by_id_v2.mdx": [
    "/references/person-v2/search_person_by_name_phone_or_address_v2",
    "/documentation/agentic-guidance/entity-shapes",
    "/documentation/person-search",
    "/references/authentication",
  ],
  "property-v2/search_property_v2.mdx": [
    "/documentation/property-search",
    "/documentation/agentic-guidance/capability-map",
    "/references/property-v2/get_property_by_id_v2",
    "/references/authentication",
    "/references/rate-limits",
  ],
  "property-v2/get_property_by_id_v2.mdx": [
    "/references/property-v2/search_property_v2",
    "/documentation/agentic-guidance/entity-shapes",
    "/documentation/property-search",
    "/references/authentication",
  ],
  "events/get_event.mdx": [
    "/documentation/events/get-event",
    "/references/events/search_deed_events",
    "/references/authentication",
  ],
  "events/search_deed_events.mdx": [
    "/documentation/events/search-events",
    "/references/events/get_event",
    "/references/regions/list_counties",
    "/references/authentication",
  ],
  "events/search_events.mdx": [
    "/documentation/events/search-events",
    "/references/events/get_event",
    "/references/authentication",
  ],
  "webhooks/create_webhook.mdx": [
    "/documentation/webhooks/create-webhook",
    "/references/webhooks/list_webhooks",
    "/references/regions/list_counties",
    "/references/authentication",
  ],
  "webhooks/delete_webhook.mdx": [
    "/documentation/webhooks/delete-webhook",
    "/references/webhooks/list_webhooks",
    "/references/authentication",
  ],
  "webhooks/get_webhook.mdx": [
    "/documentation/webhooks/list-webhooks",
    "/references/webhooks/list_webhooks",
    "/references/authentication",
  ],
  "webhooks/list_webhooks.mdx": [
    "/documentation/webhooks/list-webhooks",
    "/references/webhooks/get_webhook",
    "/references/authentication",
  ],
  "webhooks/test_webhook.mdx": [
    "/documentation/webhooks/test-webhook",
    "/references/webhooks/create_webhook",
    "/references/authentication",
  ],
  "webhooks/update_webhook.mdx": [
    "/documentation/webhooks/update-webhook",
    "/references/webhooks/get_webhook",
    "/references/authentication",
  ],
  "account/get_account_usage_data.mdx": [
    "/references/billing",
    "/references/rate-limits",
    "/references/authentication",
  ],
  "regions/list_states.mdx": [
    "/references/regions/list_counties",
    "/documentation/regions",
    "/references/authentication",
  ],
  "regions/list_counties.mdx": [
    "/references/regions/list_states",
    "/documentation/regions",
    "/references/events/search_deed_events",
    "/references/authentication",
  ],
};

function topicForPath(filePath: string): Topic | undefined {
  const directory = filePath.split("/")[0];
  return DIRECTORY_TOPICS[directory];
}

export function resolveFacets(filePath: string): Facets {
  return {
    lifecycle: "current",
    topic: topicForPath(filePath),
    keywords: FILE_KEYWORDS[filePath] ?? [],
    related: FILE_RELATED[filePath] ?? [],
  };
}

function serializeFacets(facets: Facets): string {
  const lines: string[] = [];

  if (facets.related.length > 0) {
    lines.push("related:");
    for (const id of facets.related) {
      lines.push(`  - ${id}`);
    }
  }

  lines.push(`lifecycle: ${facets.lifecycle}`);

  if (facets.topic) {
    lines.push(`topic: ${facets.topic}`);
  }

  if (facets.keywords.length > 0) {
    lines.push("keywords:");
    for (const keyword of facets.keywords) {
      lines.push(`  - ${JSON.stringify(keyword)}`);
    }
  }

  return lines.join("\n") + "\n";
}

export function injectFacets(content: string, facets: Facets): string {
  const opener = "---\n";

  if (!content.startsWith(opener)) {
    return content;
  }

  return opener + serializeFacets(facets) + content.slice(opener.length);
}
