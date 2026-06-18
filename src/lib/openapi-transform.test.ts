import { describe, expect, test } from "bun:test";
import { flattenOptionalUnions } from "./openapi-transform";

describe("flattenOptionalUnions", () => {
  test("collapses `anyOf: [string, null]` with parent title to a single string schema", () => {
    const input = {
      name: "phone",
      in: "query",
      schema: {
        anyOf: [{ type: "string", pattern: "^\\d+$" }, { type: "null" }],
        title: "Phone Number",
        description: "Phone number to search for",
      },
    };

    const result = flattenOptionalUnions(input) as Record<string, unknown>;
    const schema = result.schema as Record<string, unknown>;

    expect(schema.anyOf).toBeUndefined();
    expect(schema.type).toBe("string");
    expect(schema.pattern).toBe("^\\d+$");
    expect(schema.title).toBe("Phone Number");
    expect(schema.description).toBe("Phone number to search for");
  });

  test("collapses `oneOf: [integer, null]` similarly", () => {
    const input = {
      schema: {
        oneOf: [{ type: "integer", minimum: 18 }, { type: "null" }],
        title: "Minimum Age",
      },
    };

    const result = flattenOptionalUnions(input) as Record<string, unknown>;
    const schema = result.schema as Record<string, unknown>;

    expect(schema.oneOf).toBeUndefined();
    expect(schema.type).toBe("integer");
    expect(schema.minimum).toBe(18);
    expect(schema.title).toBe("Minimum Age");
  });

  test("leaves real multi-type unions untouched", () => {
    const input = {
      schema: {
        anyOf: [{ type: "string" }, { type: "integer" }],
        title: "Mixed",
      },
    };

    const result = flattenOptionalUnions(input) as Record<string, unknown>;
    const schema = result.schema as Record<string, unknown>;

    expect(schema.anyOf).toEqual([{ type: "string" }, { type: "integer" }]);
    expect(schema.title).toBe("Mixed");
  });

  test("strips null from a 3-way union, keeps remaining branches as a union", () => {
    const input = {
      schema: {
        anyOf: [{ type: "string" }, { type: "integer" }, { type: "null" }],
        title: "Either",
      },
    };

    const result = flattenOptionalUnions(input) as Record<string, unknown>;
    const schema = result.schema as Record<string, unknown>;

    expect(schema.anyOf).toEqual([{ type: "string" }, { type: "integer" }]);
    expect(schema.title).toBe("Either");
  });

  test("preserves parent fields when branch sets the same key", () => {
    // Parent's title wins over the branch's, matching how single-branch
    // collapses should read in the docs UI.
    const input = {
      schema: {
        anyOf: [{ type: "string", title: "branch title" }, { type: "null" }],
        title: "Phone Number",
      },
    };

    const result = flattenOptionalUnions(input) as Record<string, unknown>;
    const schema = result.schema as Record<string, unknown>;

    expect(schema.title).toBe("Phone Number");
    expect(schema.type).toBe("string");
  });

  test("recurses into nested object schemas", () => {
    const input = {
      type: "object",
      properties: {
        phones: {
          type: "array",
          items: {
            type: "object",
            properties: {
              score: {
                anyOf: [{ type: "integer" }, { type: "null" }],
                title: "Score",
              },
            },
          },
        },
      },
    };

    const result = flattenOptionalUnions(input) as Record<string, unknown>;
    const props = (result.properties as Record<string, unknown>)
      .phones as Record<string, unknown>;
    const items = props.items as Record<string, unknown>;
    const score = (items.properties as Record<string, unknown>).score as Record<
      string,
      unknown
    >;

    expect(score.anyOf).toBeUndefined();
    expect(score.type).toBe("integer");
    expect(score.title).toBe("Score");
  });

  test("leaves scalars and arrays alone", () => {
    expect(flattenOptionalUnions("hello")).toBe("hello");
    expect(flattenOptionalUnions(42)).toBe(42);
    expect(flattenOptionalUnions(null)).toBeNull();
    expect(flattenOptionalUnions([1, 2, 3])).toEqual([1, 2, 3]);
  });
});
