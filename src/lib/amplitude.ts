"use client";

import * as amplitude from "@amplitude/analytics-browser";

const EVENT_NAME_MAP: Record<string, string> = {
  "[Amplitude] Page Viewed": "WPAPIDocsPageViewed",
};

const renameEventsEnrichmentPlugin: amplitude.Types.EnrichmentPlugin = {
  name: "rename-events",
  type: "enrichment",
  setup: async () => undefined,
  execute: async (event) => {
    if (event.event_type && EVENT_NAME_MAP[event.event_type]) {
      event.event_type = EVENT_NAME_MAP[event.event_type];
    }
    return event;
  },
};

async function initAmplitude() {
  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

  if (!apiKey) {
    console.warn("Amplitude API key not found. Analytics will not be tracked.");
    return;
  }

  await amplitude.init(apiKey, undefined, {
    autocapture: {
      pageViews: true,
      formInteractions: false,
      fileDownloads: false,
    },
  }).promise;

  amplitude.add(renameEventsEnrichmentPlugin);
}

if (typeof window !== "undefined") {
  initAmplitude();
}

export const Amplitude = () => null;

export default amplitude;
