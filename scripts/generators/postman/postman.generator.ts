const OPENAPI_URL = "https://api.whitepages.com/openapi.json";
const OUTPUT_PATH = "./public/postman/collection.json";

interface PostmanCollection {
  info: {
    name: string;
    description?: string;
    schema: string;
  };
  item: PostmanItem[];
  variable?: PostmanVariable[];
}

interface PostmanItem {
  name: string;
  item?: PostmanItem[];
  request?: PostmanRequest;
}

interface PostmanRequest {
  method: string;
  header: PostmanHeader[];
  url: PostmanUrl;
  description?: string;
}

interface PostmanHeader {
  key: string;
  value: string;
  description?: string;
}

interface PostmanUrl {
  raw: string;
  protocol: string;
  host: string[];
  path: string[];
  query?: PostmanQuery[];
}

interface PostmanQuery {
  key: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

interface PostmanVariable {
  key: string;
  value: string;
  type?: string;
}

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description?: string;
    version: string;
  };
  servers?: Array<{ url: string }>;
  paths: Record<string, Record<string, OpenAPIOperation>>;
  tags?: Array<{ name: string; description?: string }>;
}

interface OpenAPIOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
}

interface OpenAPIParameter {
  name: string;
  in: string;
  description?: string;
  required?: boolean;
  schema?: { type?: string; default?: unknown };
}

interface OpenAPIRequestBody {
  description?: string;
  content?: Record<string, { schema?: unknown }>;
}

async function fetchOpenAPISpec(): Promise<OpenAPISpec> {
  const response = await fetch(OPENAPI_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI spec: ${response.statusText}`);
  }

  return response.json();
}

function parseServerUrl(servers?: Array<{ url: string }>): {
  protocol: string;
  host: string[];
} {
  const serverUrl = servers?.[0]?.url || "https://api.whitepages.com";
  const url = new URL(serverUrl);
  return {
    protocol: url.protocol.replace(":", ""),
    host: url.host.split("."),
  };
}

function convertPathToPostmanPath(path: string): string[] {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith("{") && segment.endsWith("}")) {
        return `:${segment.slice(1, -1)}`;
      }
      return segment;
    });
}

function buildQueryParameters(
  parameters?: OpenAPIParameter[],
): PostmanQuery[] | undefined {
  const queryParams = parameters?.filter((p) => p.in === "query");
  if (!queryParams?.length) return undefined;

  return queryParams.map((param) => ({
    key: param.name,
    value: String(param.schema?.default ?? ""),
    description: param.description,
    disabled: !param.required,
  }));
}

function buildHeaders(parameters?: OpenAPIParameter[]): PostmanHeader[] {
  const headers: PostmanHeader[] = [
    {
      key: "X-Api-Key",
      value: "{{apiKey}}",
      description: "Your Whitepages API key",
    },
  ];

  const headerParams = parameters?.filter((p) => p.in === "header");
  headerParams?.forEach((param) => {
    if (param.name.toLowerCase() !== "x-api-key") {
      headers.push({
        key: param.name,
        value: String(param.schema?.default ?? ""),
        description: param.description,
      });
    }
  });

  return headers;
}

function convertOperationToPostmanRequest(
  path: string,
  method: string,
  operation: OpenAPIOperation,
  serverInfo: { protocol: string; host: string[] },
): PostmanRequest {
  const postmanPath = convertPathToPostmanPath(path);
  const queryParams = buildQueryParameters(operation.parameters);

  let rawUrl = `${serverInfo.protocol}://${serverInfo.host.join(".")}/${postmanPath.join("/")}`;
  if (queryParams?.length) {
    const enabledParams = queryParams
      .filter((q) => !q.disabled)
      .map((q) => `${q.key}=${q.value}`)
      .join("&");
    if (enabledParams) {
      rawUrl += `?${enabledParams}`;
    }
  }

  return {
    method: method.toUpperCase(),
    header: buildHeaders(operation.parameters),
    url: {
      raw: rawUrl,
      protocol: serverInfo.protocol,
      host: serverInfo.host,
      path: postmanPath,
      query: queryParams,
    },
    description: operation.description || operation.summary,
  };
}

function groupOperationsByTag(
  paths: OpenAPISpec["paths"],
  serverInfo: { protocol: string; host: string[] },
): Map<string, PostmanItem[]> {
  const tagGroups = new Map<string, PostmanItem[]>();

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (typeof operation !== "object" || !operation) continue;

      const tags = operation.tags || ["Other"];
      const request = convertOperationToPostmanRequest(
        path,
        method,
        operation,
        serverInfo,
      );

      const itemName =
        operation.summary ||
        operation.operationId ||
        `${method.toUpperCase()} ${path}`;

      for (const tag of tags) {
        if (!tagGroups.has(tag)) {
          tagGroups.set(tag, []);
        }
        tagGroups.get(tag)!.push({
          name: itemName,
          request,
        });
      }
    }
  }

  return tagGroups;
}

function convertOpenAPIToPostman(spec: OpenAPISpec): PostmanCollection {
  const serverInfo = parseServerUrl(spec.servers);
  const tagGroups = groupOperationsByTag(spec.paths, serverInfo);

  const items: PostmanItem[] = [];
  for (const [tagName, tagItems] of tagGroups) {
    items.push({
      name: tagName,
      item: tagItems,
    });
  }

  return {
    info: {
      name: spec.info.title,
      description: spec.info.description,
      schema:
        "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: items,
    variable: [
      {
        key: "apiKey",
        value: "YOUR_API_KEY",
        type: "string",
      },
    ],
  };
}

async function main(): Promise<void> {
  console.log("Fetching OpenAPI spec...");
  const spec = await fetchOpenAPISpec();

  console.log("Converting to Postman collection...");
  const collection = convertOpenAPIToPostman(spec);

  console.log(`Writing collection to ${OUTPUT_PATH}...`);
  await Bun.write(OUTPUT_PATH, JSON.stringify(collection, null, 2));

  console.log("Done!");
}

void main();
