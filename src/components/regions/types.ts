export enum RegionLevel {
  State = "state",
  County = "county",
}

export enum BrowseLevel {
  States = "states",
  Counties = "counties",
}

export interface RegionEntry {
  name: string;
  slug: string;
  state_code?: string;
  fips_code?: string;
  level: RegionLevel;
  stateName?: string;
  stateCode?: string;
  supported_webhook_events: string[];
}

export interface BreadcrumbEntry {
  label: string;
  level: BrowseLevel;
  stateCode?: string;
}

export function supportsWebhooks(region: RegionEntry): boolean {
  return region.supported_webhook_events.length > 0;
}

export function supportsWebhookEvent(
  region: RegionEntry,
  eventType: string,
): boolean {
  return region.supported_webhook_events.includes(eventType);
}
