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
