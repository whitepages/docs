import { generateFiles } from "fumadocs-openapi";
import { createOpenAPI } from "fumadocs-openapi/server";
import type { OpenAPISpec } from "./openapi.types";
import { extractTagGroups, tagToDirectoryName } from "./openapi.utils";
import { generateRoutesPageMarkdown } from "./openapi.handler";

const OPENAPI_URL = "https://api.whitepages.com/openapi.json";
const OUTPUT_DIR = "./content/docs/references";

async function fetchOpenAPISpec(): Promise<OpenAPISpec> {
  const response = await fetch(OPENAPI_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI spec: ${response.statusText}`);
  }

  return response.json();
}

async function generateApiEndpointDocs(): Promise<void> {
  const openapi = createOpenAPI({ input: [OPENAPI_URL] });

  await generateFiles({
    input: openapi,
    output: OUTPUT_DIR,
    groupBy: "tag",
  });
}

async function generateRoutesPage(spec: OpenAPISpec): Promise<void> {
  const tagGroups = extractTagGroups(spec);
  const routesContent = generateRoutesPageMarkdown(tagGroups);

  const routesPath = `${OUTPUT_DIR}/index.mdx`;
  await Bun.write(routesPath, routesContent);
  console.log(`Generated: ${routesPath}`);
}

async function generateMetaFiles(spec: OpenAPISpec): Promise<void> {
  const tagGroups = extractTagGroups(spec);

  for (const group of tagGroups) {
    const directoryName = tagToDirectoryName(group.name);
    const metaPath = `${OUTPUT_DIR}/${directoryName}/meta.json`;

    const pages = group.routes.map((route) => {
      const parts = route.href.split("/");
      return parts[parts.length - 1];
    });

    const metaContent = {
      title: group.name,
      pages: pages,
    };

    await Bun.write(metaPath, JSON.stringify(metaContent, null, 2) + "\n");
    console.log(`Generated: ${metaPath}`);
  }
}

async function main(): Promise<void> {
  const spec = await fetchOpenAPISpec();
  await generateApiEndpointDocs();
  await generateRoutesPage(spec);
  await generateMetaFiles(spec);
}

void main();
