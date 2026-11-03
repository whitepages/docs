import { z } from "zod";
import { assistantDestination } from "./docs-assistant";

const GatewaySchema = z.url().refine((gateway) => {
  try {
    assistantDestination(gateway, "turns");
    return true;
  } catch {
    return false;
  }
});
const DocsAssistantConfigSchema = z
  .discriminatedUnion("enabled", [
    z.object({ enabled: z.literal(false) }),
    z.object({ enabled: z.literal(true), gateway: GatewaySchema }),
  ])
  .readonly();
export type DocsAssistantConfig = z.infer<typeof DocsAssistantConfigSchema>;

export function parseDocsAssistantConfig(
  values: Readonly<{ enabled: unknown; gateway: unknown }>,
): DocsAssistantConfig {
  const parsed = DocsAssistantConfigSchema.safeParse({
    enabled: values.enabled === "true",
    gateway: values.gateway,
  });
  return parsed.success ? parsed.data : { enabled: false };
}

export const docsAssistantConfig = parseDocsAssistantConfig({
  enabled: process.env.NEXT_PUBLIC_DOCS_ASSISTANT_ENABLED,
  gateway: process.env.NEXT_PUBLIC_DOCS_ASSISTANT_URL,
});
