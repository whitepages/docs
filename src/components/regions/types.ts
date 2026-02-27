export interface RegionEntry {
  name: string;
  slug: string;
  state_code?: string;
  fips_code?: string;
  level: "state" | "county";
  stateName?: string;
  stateCode?: string;
}

export type BrowseLevel = "states" | "counties";

export interface BreadcrumbEntry {
  label: string;
  level: BrowseLevel;
  stateCode?: string;
}
