import { expect, it } from "bun:test";
import { generateFilesOnly } from "fumadocs-openapi";
import { createOpenAPI } from "fumadocs-openapi/server";
import { parseDoc } from "./corpus.core";

it("parses endpoint metadata and canonical URLs from raw Fumadocs output", async () => {
  const input = createOpenAPI({
    input: () => ({
      fixture: {
        openapi: "3.1.0",
        info: { title: "Example API", version: "1.0.0" },
        tags: [{ name: "regions" }],
        paths: {
          "/v1/regions/states/{state_code}/counties": {
            get: {
              operationId: "list_counties",
              summary: "List counties for a state",
              tags: ["regions"],
              parameters: [
                {
                  in: "path",
                  name: "state_code",
                  required: true,
                  schema: { type: "string" },
                },
              ],
              responses: { "200": { description: "County list" } },
            },
          },
        },
      },
    }),
  });
  const files = await generateFilesOnly({ input, groupBy: "tag" });
  const page = files.find((file) => file.path === "regions/list_counties.mdx");
  if (!page)
    throw new Error(
      `Expected generated endpoint page; received ${files.map((file) => file.path).join(", ")}`,
    );
  const document = parseDoc(`references/${page.path}`, page.content);
  expect(document.entry.endpoint).toEqual({
    operationId: "list_counties",
    path: "/v1/regions/states/{state_code}/counties",
    method: "get",
  });
  expect(document.entry.page_url).toBe(
    "/docs/references/regions/list_counties",
  );
});
