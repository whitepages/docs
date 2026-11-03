import { z } from "zod";

const RootPathSchema = z
  .string()
  .max(2048)
  .regex(/^\/(?!\/)[^?#\\\x00-\x20]*$/);
const PageSchema = z
  .object({
    path: RootPathSchema,
    doc_id: z.string().max(256).nullable(),
    expected_page_url: z.url().max(4096),
  })
  .readonly();
const AnalyticsSchema = z
  .object({
    amplitude_user_id: z.string().max(256).nullable(),
    amplitude_session_id: z.string().max(256).nullable(),
  })
  .readonly();
export const BrowserTurnSchema = z
  .object({
    request_id: z.uuid(),
    browser_flow_id: z.uuid(),
    conversation_id: z.uuid().nullable(),
    message: z.string().min(1).max(8192),
    page: PageSchema,
    analytics: AnalyticsSchema,
  })
  .readonly();
export type BrowserTurn = z.infer<typeof BrowserTurnSchema>;
export const BrowserRecallSchema = z
  .object({ conversation_id: z.uuid(), browser_flow_id: z.uuid() })
  .readonly();
export type BrowserRecall = z.infer<typeof BrowserRecallSchema>;

export function assistantDestination(
  gateway: string,
  operation: "turns" | "conversations/recall",
): URL {
  const address = new URL(`/api/v1/docs-assistant/${operation}`, gateway);
  if (
    address.protocol !== "https:" &&
    !(
      address.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(address.hostname)
    )
  )
    throw new Error("Invalid assistant destination");
  return address;
}

const AssistantEventTypeSchema = z.enum({
  AssistantText: "assistant_text",
  Activity: "activity",
  Completed: "completed",
  Failed: "failed",
} as const);
export const AssistantEventType = AssistantEventTypeSchema.enum;
const AssistantActivitySchema = z.enum({
  Thinking: "thinking",
  ReferencingDocumentation: "referencing_documentation",
} as const);
export const AssistantActivity = AssistantActivitySchema.enum;
export type AssistantActivity = z.infer<typeof AssistantActivitySchema>;
const RecallStatusSchema = z.enum({
  Loading: "loading",
  Ready: "ready",
  Failed: "failed",
} as const);
export const RecallStatus = RecallStatusSchema.enum;
export type RecallStatus = z.infer<typeof RecallStatusSchema>;

export function unexpectedAssistantState(value: never): never {
  throw new Error(`Unhandled assistant state of type ${typeof value}`);
}

export function assistantActivityLabel(activity: AssistantActivity): string {
  switch (activity) {
    case AssistantActivity.Thinking:
      return "Thinking…";
    case AssistantActivity.ReferencingDocumentation:
      return "Referencing documentation…";
    default:
      return unexpectedAssistantState(activity);
  }
}

const AssistantEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(AssistantEventType.AssistantText),
    content: z.string(),
  }),
  z.object({
    type: z.literal(AssistantEventType.Activity),
    activity: AssistantActivitySchema,
  }),
  z.object({
    type: z.literal(AssistantEventType.Completed),
    conversation_id: z.uuid(),
    request_id: z.uuid(),
  }),
  z.object({
    type: z.literal(AssistantEventType.Failed),
    reason: z.enum([
      "interrupted",
      "upstream_unavailable",
      "invalid_tool",
      "resource_limit",
    ]),
    correlation_id: z.uuid(),
  }),
]);
export type AssistantEvent = z.infer<typeof AssistantEventSchema>;
const DocumentIdentitySchema = z
  .object({ id: z.string(), page_url: RootPathSchema })
  .readonly();
export type DocumentIdentity = z.infer<typeof DocumentIdentitySchema>;
const CatalogSchema = z.object({
  version: z.literal(1),
  documents: z.array(DocumentIdentitySchema).readonly(),
});
const VisibleRecordSchema = z
  .object({
    id: z.uuid(),
    role: z.enum(["customer", "assistant"]),
    content: z.string(),
    created_at: z.iso.datetime({ offset: true }),
  })
  .readonly();
export type VisibleRecord = z.infer<typeof VisibleRecordSchema>;
const RecallSchema = z
  .object({
    conversation_id: z.uuid(),
    records: z.array(VisibleRecordSchema).readonly(),
    interrupted: z.boolean(),
  })
  .readonly();

export function parseEvent(value: unknown): AssistantEvent {
  return AssistantEventSchema.parse(value);
}
export function parseCatalog(value: unknown): readonly DocumentIdentity[] {
  return CatalogSchema.parse(value).documents;
}
export function parseRecall(value: unknown): z.infer<typeof RecallSchema> {
  return RecallSchema.parse(value);
}
export function pageContext(
  address: string,
  documents: readonly DocumentIdentity[],
): z.infer<typeof PageSchema> {
  const page = new URL(address);
  return {
    path: page.pathname,
    expected_page_url: `${page.origin}${page.pathname}`,
    doc_id:
      documents.find((document) => document.page_url === page.pathname)?.id ??
      null,
  };
}
