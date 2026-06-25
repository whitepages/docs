export type Lifecycle = "current" | "deprecated";

export type Topic =
  | "person"
  | "property"
  | "deed-events"
  | "webhooks"
  | "account-billing"
  | "getting-started"
  | "regions"
  | "versioning";

export type DocKind = "guide" | "reference" | "endpoint";

export interface EndpointFacet {
  readonly operationId: string;
  readonly path: string;
  readonly method: string;
}

export interface CatalogEntry {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly kind: DocKind;
  readonly lifecycle: Lifecycle;
  readonly topic: Topic | null;
  readonly keywords: readonly string[];
  readonly edges: readonly string[];
  readonly endpoint: EndpointFacet | null;
}

export interface Catalog {
  readonly version: number;
  readonly docs: readonly CatalogEntry[];
}

export interface ParsedDoc {
  readonly id: string;
  readonly slug: string;
  readonly entry: CatalogEntry;
  readonly body: string;
  readonly related: readonly string[];
}
