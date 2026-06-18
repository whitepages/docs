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

type JsonValue =
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
