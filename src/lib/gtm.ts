"use client";

import { ConsentEvent, ConsentValue, getConsent } from "@/lib/consent";

const GTM_CONTAINER_ID = "GTM-TH3ZZ2G";

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

let initialized = false;

function initGTM() {
  if (initialized) return;
  initialized = true;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`;
  document.head.appendChild(script);
}

if (typeof window !== "undefined") {
  if (getConsent() === ConsentValue.Accepted) {
    initGTM();
  }

  document.addEventListener(ConsentEvent.Updated, ((
    event: CustomEvent<string>,
  ) => {
    if (event.detail === ConsentValue.Accepted) {
      initGTM();
    }
  }) as EventListener);
}

export const GoogleTagManager = () => null;
