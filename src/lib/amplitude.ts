"use client";

import * as amplitude from "@amplitude/analytics-browser";

const PAGE_TYPE = "APIDocumentation" as const;

const whitepagesPropertiesPlugin: amplitude.Types.EnrichmentPlugin = {
  name: "whitepages-properties",
  type: "enrichment",
  setup: async () => undefined,
  execute: async (event) => {
    const referringUrl = document.referrer;
    return {
      ...event,
      event_properties: {
        ...event.event_properties,
        PathName: window.location.pathname,
        Url: window.location.href,
        ReferringUrl: referringUrl,
        ...(referringUrl && { ReferringSite: new URL(referringUrl).hostname }),
        PageType: PAGE_TYPE,
      },
    };
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
      pageViews: {
        trackHistoryChanges: "all",
        eventType: "ViewedAPIDocumentation",
      },
      formInteractions: false,
      fileDownloads: false,
    },
    cookieOptions: {
      domain: ".whitepages.com",
    },
  }).promise;

  amplitude.add(whitepagesPropertiesPlugin);
}

if (typeof window !== "undefined") {
  initAmplitude();
}

export const Amplitude = () => null;

export default amplitude;
