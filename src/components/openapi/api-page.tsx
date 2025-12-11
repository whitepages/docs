import { openapi } from "@/lib/openapi";
import { createAPIPage } from "fumadocs-openapi/ui";
import client from "./api-page.client";

export const APIPage = createAPIPage(openapi, {
  client,
  generateTypeScriptSchema: false,
  showResponseSchema: true,
  schemaUI: {
    showExample: true,
  },
});
