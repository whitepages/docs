export type Lifecycle = "current" | "deprecated";

export type Topic =
  | "person"
  | "property"
  | "deed-events"
  | "webhooks"
  | "account-billing"
  | "getting-started";

export interface CatalogEntry {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly lifecycle: Lifecycle;
  readonly topic: Topic | null;
  readonly keywords: readonly string[];
}

export interface Catalog {
  readonly version: number;
  readonly docs: readonly CatalogEntry[];
}

export interface ParsedDoc {
  readonly id: string;
  readonly entry: CatalogEntry;
  readonly body: string;
}
