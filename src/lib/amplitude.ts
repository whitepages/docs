"use client";

import * as amplitude from "@amplitude/analytics-browser";

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
}

if (typeof window !== "undefined") {
  initAmplitude();
}

export const Amplitude = () => null;

export default amplitude;
