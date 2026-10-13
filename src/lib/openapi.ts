import { createOpenAPI } from "fumadocs-openapi/server";
import { flattenOptionalUnions, stripAutoTitles } from "./openapi-transform";

const OPENAPI_URL = "https://api.whitepages.com/openapi.json";

// fumadocs-openapi's `SchemaMap` type (a Document per URL) isn't exported,
// so the input function is typed off `createOpenAPI`'s own signature rather
// than a guessed private type name. `response.json()` returns an untyped
// value; the cast asserts it's the OpenAPI document the URL promises.
type OpenAPIInput = NonNullable<Parameters<typeof createOpenAPI>[0]>["input"];

export const openapi = createOpenAPI({
  input: (async () => {
    const response = await fetch(OPENAPI_URL);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch OpenAPI spec from ${OPENAPI_URL}: ${response.status} ${response.statusText}`,
      );
    }
    const spec = await response.json();
    return { [OPENAPI_URL]: stripAutoTitles(flattenOptionalUnions(spec)) };
  }) as OpenAPIInput,
});
