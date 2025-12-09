export interface OpenAPISpec {
  tags?: Array<{
    name: string;
    description?: string;
  }>;
  paths: Record<
    string,
    Record<
      string,
      {
        tags?: string[];
        summary?: string;
        description?: string;
        operationId?: string;
      }
    >
  >;
}

export interface RouteInfo {
  title: string;
  description: string;
  href: string;
}

export interface TagGroup {
  name: string;
  description: string;
  routes: RouteInfo[];
}
