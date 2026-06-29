"use client";

import amplitude from "@/lib/amplitude";
import { NavigationTitle } from "@/components/layout/navigation-title";

export function trackHeaderSiteLinkClick(): void {
  amplitude.track("WPClickedHeaderSiteLink", { LinkType: "API" });
}

export function WhitepagesLogoLink() {
  return (
    <span onClick={() => trackHeaderSiteLinkClick()}>
      <NavigationTitle />
    </span>
  );
}
