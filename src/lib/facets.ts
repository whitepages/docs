import { z } from "zod";

export const LIFECYCLES = ["current", "deprecated"] as const;
export type Lifecycle = (typeof LIFECYCLES)[number];

export const TOPICS = [
  "person",
  "property",
  "deed-events",
  "webhooks",
  "account-billing",
  "getting-started",
] as const;
export type Topic = (typeof TOPICS)[number];

export const facetFrontmatterFields = {
  lifecycle: z.enum(LIFECYCLES).default("current"),
  topic: z.enum(TOPICS).optional(),
  keywords: z.array(z.string()).default([]),
};
