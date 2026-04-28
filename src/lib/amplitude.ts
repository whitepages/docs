"use client";

import * as amplitude from "@amplitude/analytics-browser";
import { getConsent } from "@/lib/consent";

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

let initialized = false;

async function initAmplitude() {
  if (initialized) return;
  initialized = true;

  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

  if (!apiKey) {
    console.warn("Amplitude API key not found. Analytics will not be tracked.");
    initialized = false;
    return;
  }

  await amplitude.init(apiKey, undefined, {
    autocapture: {
      pageViews: true,
      formInteractions: false,
      fileDownloads: false,
    },
    cookieOptions: {
      domain: ".whitepages.com",
    },
  }).promise;

  amplitude.add(renameEventsEnrichmentPlugin);
}

if (typeof window !== "undefined") {
  if (getConsent() === "accepted") {
    initAmplitude();
  }

  document.addEventListener("consentUpdated", ((event: CustomEvent<string>) => {
    if (event.detail === "accepted") {
      initAmplitude();
    } else if (initialized) {
      amplitude.setOptOut(true);
    }
  }) as EventListener);
}

export const Amplitude = () => null;

export default amplitude;
