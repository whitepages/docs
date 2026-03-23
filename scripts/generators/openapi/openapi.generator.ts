import { generateFiles } from "fumadocs-openapi";
import { createOpenAPI } from "fumadocs-openapi/server";
import type { OpenAPISpec } from "./openapi.types";
import {
  DEPRECATED_TAGS,
  extractTagGroups,
  tagToDirectoryName,
  tagToDisplayName,
} from "./openapi.utils";
import { generateRoutesPageMarkdown } from "./openapi.handler";

const OPENAPI_URL = "https://api.whitepages.com/openapi.json";
const OUTPUT_DIR = "./content/docs/references";

async function fetchOpenApiSpec(): Promise<OpenAPISpec> {
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
    beforeWrite(files) {
      const deprecatedDirectories = DEPRECATED_TAGS.map(tagToDirectoryName);
      const nonDeprecatedFiles = files.filter(
        (file) =>
          !deprecatedDirectories.some((directory) =>
            file.path.startsWith(`${directory}/`),
          ),
      );
      files.splice(0, files.length, ...nonDeprecatedFiles);
    },
  });
}

async function generateRoutesPage(openApiSpec: OpenAPISpec): Promise<void> {
  const tagGroups = extractTagGroups(openApiSpec);
  const routesContent = generateRoutesPageMarkdown(tagGroups);

  const routesPath = `${OUTPUT_DIR}/index.mdx`;
  await Bun.write(routesPath, routesContent);
  console.log(`Generated: ${routesPath}`);
}

async function generateMetaFiles(openApiSpec: OpenAPISpec): Promise<void> {
  const tagGroups = extractTagGroups(openApiSpec);

  for (const tagGroup of tagGroups) {
    const directoryName = tagToDirectoryName(tagGroup.name);
    const metaPath = `${OUTPUT_DIR}/${directoryName}/meta.json`;

    const pages = tagGroup.routes.map((route) => {
      const hrefSegments = route.href.split("/");
      return hrefSegments[hrefSegments.length - 1];
    });

    const metaContent = {
      title: tagToDisplayName(tagGroup.name),
      pages: pages,
    };

    await Bun.write(metaPath, JSON.stringify(metaContent, null, 2) + "\n");
    console.log(`Generated: ${metaPath}`);
  }
}

async function cleanupDeprecatedDirectories(): Promise<void> {
  for (const tag of DEPRECATED_TAGS) {
    const directoryPath = `${OUTPUT_DIR}/${tagToDirectoryName(tag)}`;
    await Bun.$`rm -rf ${directoryPath}`;
  }
}

async function main(): Promise<void> {
  const openApiSpec = await fetchOpenApiSpec();
  await cleanupDeprecatedDirectories();
  await generateApiEndpointDocs();
  await generateRoutesPage(openApiSpec);
  await generateMetaFiles(openApiSpec);
}

void main();
