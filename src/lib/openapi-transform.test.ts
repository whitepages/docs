import { describe, expect, test } from "bun:test";
import { flattenOptionalUnions, stripAutoTitles } from "./openapi-transform";

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

describe("stripAutoTitles", () => {
  test("strips title from a property when it matches the auto form", () => {
    const input = {
      type: "object",
      properties: {
        aliases: {
          type: "array",
          items: { type: "string" },
          title: "Aliases",
          description: "List of aliases for the person",
        },
      },
    };

    const result = stripAutoTitles(input) as Record<string, unknown>;
    const aliases = (result.properties as Record<string, unknown>)
      .aliases as Record<string, unknown>;

    expect(aliases.title).toBeUndefined();
    expect(aliases.type).toBe("array");
    expect(aliases.items).toEqual({ type: "string" });
    expect(aliases.description).toBe("List of aliases for the person");
  });

  test("keeps intentionally customized property titles", () => {
    const input = {
      properties: {
        // Pydantic auto-form would be "Phone"; this is overridden.
        phone: {
          type: "string",
          title: "Phone Number",
        },
        // Auto-form match — strips.
        aliases: {
          type: "array",
          items: { type: "string" },
          title: "Aliases",
        },
      },
    };

    const result = stripAutoTitles(input) as Record<string, unknown>;
    const props = result.properties as Record<string, unknown>;
    const phone = props.phone as Record<string, unknown>;
    const aliases = props.aliases as Record<string, unknown>;

    expect(phone.title).toBe("Phone Number");
    expect(aliases.title).toBeUndefined();
  });

  test("handles snake_case auto-titles (multi-word field names)", () => {
    const input = {
      properties: {
        first_name: { type: "string", title: "First Name" },
        linkedin_url: { type: "string", title: "Linkedin Url" },
        match_score: { type: "integer", title: "Match Score" },
        min_age: { type: "integer", title: "Minimum Age" }, // intentional
      },
    };

    const result = stripAutoTitles(input) as Record<string, unknown>;
    const props = result.properties as Record<string, unknown>;

    expect((props.first_name as Record<string, unknown>).title).toBeUndefined();
    expect(
      (props.linkedin_url as Record<string, unknown>).title,
    ).toBeUndefined();
    expect(
      (props.match_score as Record<string, unknown>).title,
    ).toBeUndefined();
    expect((props.min_age as Record<string, unknown>).title).toBe(
      "Minimum Age",
    );
  });

  test("strips title from a query parameter's schema when it matches the auto form", () => {
    const input = {
      paths: {
        "/v2/person/": {
          get: {
            parameters: [
              {
                name: "name",
                in: "query",
                schema: { type: "string", title: "Name" },
              },
              {
                name: "phone",
                in: "query",
                schema: { type: "string", title: "Phone Number" },
              },
              {
                name: "zipcode",
                in: "query",
                schema: { type: "string", title: "5-Digit ZIP Code" },
              },
            ],
          },
        },
      },
    };

    const result = stripAutoTitles(input) as Record<string, unknown>;
    const params = (
      (
        (result.paths as Record<string, unknown>)["/v2/person/"] as Record<
          string,
          unknown
        >
      ).get as Record<string, unknown>
    ).parameters as Array<Record<string, unknown>>;

    expect((params[0].schema as Record<string, unknown>).title).toBeUndefined();
    expect((params[1].schema as Record<string, unknown>).title).toBe(
      "Phone Number",
    );
    expect((params[2].schema as Record<string, unknown>).title).toBe(
      "5-Digit ZIP Code",
    );
  });

  test("recurses into nested object properties", () => {
    const input = {
      type: "object",
      properties: {
        result_metadata: {
          type: "object",
          title: "Result Metadata",
          properties: {
            phones: {
              type: "object",
              title: "Phones",
              properties: {
                displayed: { type: "integer", title: "Displayed" },
                additional: { type: "integer", title: "Additional" },
              },
            },
          },
        },
      },
    };

    const result = stripAutoTitles(input) as Record<string, unknown>;
    const rm = (result.properties as Record<string, unknown>)
      .result_metadata as Record<string, unknown>;
    const phones = (rm.properties as Record<string, unknown>).phones as Record<
      string,
      unknown
    >;
    const displayed = (phones.properties as Record<string, unknown>)
      .displayed as Record<string, unknown>;

    expect(rm.title).toBeUndefined();
    expect(phones.title).toBeUndefined();
    expect(displayed.title).toBeUndefined();
    expect(displayed.type).toBe("integer");
  });

  test("leaves non-property non-parameter titles alone", () => {
    // Top-level component schema names commonly carry titles that are
    // class names; those aren't redundant with a property name so we
    // leave them.
    const input = {
      components: {
        schemas: {
          PersonV2ResponseDto: {
            type: "object",
            title: "PersonV2ResponseDto",
            properties: {},
          },
        },
      },
    };

    const result = stripAutoTitles(input) as Record<string, unknown>;
    const schema = (
      (result.components as Record<string, unknown>).schemas as Record<
        string,
        unknown
      >
    ).PersonV2ResponseDto as Record<string, unknown>;

    expect(schema.title).toBe("PersonV2ResponseDto");
  });
});
