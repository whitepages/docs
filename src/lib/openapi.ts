import { createOpenAPI } from "fumadocs-openapi/server";
import { flattenOptionalUnions, stripAutoTitles } from "./openapi-transform";

const OPENAPI_URL = "https://api.whitepages.com/openapi.json";

export const openapi = createOpenAPI({
  input: async () => {
    const response = await fetch(OPENAPI_URL);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch OpenAPI spec from ${OPENAPI_URL}: ${response.status} ${response.statusText}`,
      );
    }
    const spec = await response.json();
    return { [OPENAPI_URL]: stripAutoTitles(flattenOptionalUnions(spec)) };
  },
});
