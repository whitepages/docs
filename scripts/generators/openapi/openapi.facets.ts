import type { Lifecycle, Topic } from "../../../src/lib/facets";

export interface Facets {
  lifecycle: Lifecycle;
  topic?: Topic;
  keywords: string[];
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

function topicForPath(filePath: string): Topic | undefined {
  const directory = filePath.split("/")[0];
  return DIRECTORY_TOPICS[directory];
}

export function resolveFacets(filePath: string): Facets {
  return {
    lifecycle: "current",
    topic: topicForPath(filePath),
    keywords: FILE_KEYWORDS[filePath] ?? [],
  };
}

function serializeFacets(facets: Facets): string {
  const lines = [`lifecycle: ${facets.lifecycle}`];

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
