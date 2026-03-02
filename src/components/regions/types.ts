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
}

export interface BreadcrumbEntry {
  label: string;
  level: BrowseLevel;
  stateCode?: string;
}

const WEBHOOK_SUPPORTED_STATE_CODES = new Set(["TX"]);

export function supportsWebhooks(region: RegionEntry): boolean {
  if (region.level === RegionLevel.State) {
    return WEBHOOK_SUPPORTED_STATE_CODES.has(region.state_code ?? "");
  }
  return WEBHOOK_SUPPORTED_STATE_CODES.has(region.stateCode ?? "");
}
