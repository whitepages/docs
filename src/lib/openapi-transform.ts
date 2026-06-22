/**
 * OpenAPI schema transformer that flattens optional `anyOf` / `oneOf`.
 *
 * Pydantic v2 (used upstream by the API server) emits optional fields as
 * `anyOf: [<real-type>, {type: "null"}]` per OpenAPI 3.1's preferred way
 * of expressing nullability. The Fumadocs renderer walks both branches
 * and falls back to the parent schema's `title` when a branch has none —
 * so an optional `phone: string | None` query parameter with parent
 * `title: "Phone Number"` renders as `Phone Number | Phone Number`.
 *
 * This transform walks an OpenAPI document and rewrites any `anyOf` /
 * `oneOf` schema whose only non-null branch is a single concrete type
 * into that branch directly, preserving the parent's `title`,
 * `description`, `examples`, and any other sibling fields. Optional
 * fields end up displaying as their actual type instead of `T | T`.
 *
 * The transform is intentionally narrow:
 *
 * - Only fires when the union contains a `{ type: "null" }` branch and
 *   the remaining non-null branches collapse to exactly one schema.
 * - Real multi-type unions (e.g. `anyOf: [string, integer]` with no
 *   null) are left untouched.
 * - Unions of multiple non-null types plus null (e.g.
 *   `anyOf: [string, integer, null]`) have the null branch stripped
 *   but stay as a union of the remaining branches.
 */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function isObject(value: unknown): value is { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullBranch(branch: JsonValue): boolean {
  return isObject(branch) && branch.type === "null";
}

function flattenUnionKey(
  node: { [key: string]: JsonValue },
  key: "anyOf" | "oneOf",
): { [key: string]: JsonValue } | null {
  const union = node[key];
  if (!Array.isArray(union)) return null;

  const nonNull = union.filter((branch) => !isNullBranch(branch));
  if (nonNull.length === union.length) return null;

  // Multiple non-null branches remain — keep as a real union, just drop null.
  if (nonNull.length > 1) {
    const { [key]: _, ...rest } = node;
    return { ...rest, [key]: nonNull };
  }

  // Single non-null branch — collapse: the branch supplies the concrete
  // type/pattern/examples; the parent supplies title/description/etc.
  const branch = nonNull[0];
  if (!isObject(branch)) return null;
  const { [key]: _, ...parentRest } = node;
  return { ...branch, ...parentRest };
}

export function flattenOptionalUnions(node: JsonValue): JsonValue {
  if (Array.isArray(node)) {
    return node.map(flattenOptionalUnions);
  }
  if (!isObject(node)) {
    return node;
  }

  // Recurse first so nested unions inside object values are normalized
  // before we look at this node's own anyOf/oneOf.
  const recursed: { [key: string]: JsonValue } = {};
  for (const [k, v] of Object.entries(node)) {
    recursed[k] = flattenOptionalUnions(v);
  }

  const afterAnyOf = flattenUnionKey(recursed, "anyOf") ?? recursed;
  const afterOneOf = flattenUnionKey(afterAnyOf, "oneOf") ?? afterAnyOf;
  return afterOneOf;
}

/**
 * Pydantic v2 auto-generates each field's OpenAPI `title` from the field
 * name (snake_case → Title Case). The Fumadocs renderer surfaces that
 * title as the property's type label — so `aliases: list[str]` renders
 * as `Aliases` instead of `array<string>`, and `match_score: int | None`
 * (after `flattenOptionalUnions`) renders as `Match Score` instead of
 * `integer`. The auto-generated titles carry no information the field
 * name doesn't already convey, so stripping them lets the renderer fall
 * back to the actual type.
 *
 * The strip is intentionally conservative: it only removes a `title`
 * when the title is character-identical to the Pydantic auto-form of
 * the property or parameter name. Titles that have been intentionally
 * customized (e.g. `phone` → `"Phone Number"`, `min_age` →
 * `"Minimum Age"`, `zipcode` → `"5-Digit ZIP Code"`) are preserved.
 */
export function stripAutoTitles(node: JsonValue): JsonValue {
  if (Array.isArray(node)) {
    return node.map(stripAutoTitles);
  }
  if (!isObject(node)) {
    return node;
  }

  const out: { [key: string]: JsonValue } = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === "properties" && isObject(value)) {
      out[key] = stripAutoTitleFromProperties(value);
    } else if (key === "parameters" && Array.isArray(value)) {
      out[key] = value.map(stripAutoTitleFromParameter);
    } else {
      out[key] = stripAutoTitles(value);
    }
  }
  return out;
}

function stripAutoTitleFromProperties(properties: {
  [key: string]: JsonValue;
}): { [key: string]: JsonValue } {
  const out: { [key: string]: JsonValue } = {};
  for (const [propName, propSchema] of Object.entries(properties)) {
    out[propName] = stripTitleIfAuto(propSchema, propName);
  }
  return out;
}

function stripAutoTitleFromParameter(param: JsonValue): JsonValue {
  if (!isObject(param)) return stripAutoTitles(param);
  const name = param.name;
  const schema = param.schema;
  if (typeof name === "string" && isObject(schema)) {
    return {
      ...(stripAutoTitles(param) as { [key: string]: JsonValue }),
      schema: stripTitleIfAuto(schema, name),
    };
  }
  return stripAutoTitles(param);
}

function stripTitleIfAuto(schema: JsonValue, name: string): JsonValue {
  const recursed = stripAutoTitles(schema);
  if (!isObject(recursed)) return recursed;
  if (typeof recursed.title !== "string") return recursed;
  if (recursed.title !== autoTitleCase(name)) return recursed;
  const { title: _, ...rest } = recursed;
  return rest;
}

/**
 * Mirror Pydantic v2's auto-title generation: split on underscores,
 * capitalize the first character of each segment, join with spaces.
 * `aliases` → `Aliases`, `linkedin_url` → `Linkedin Url`.
 */
function autoTitleCase(name: string): string {
  return name
    .split("_")
    .map((part) =>
      part.length === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(" ");
}
