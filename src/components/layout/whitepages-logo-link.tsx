"use client";

import amplitude from "@/lib/amplitude";
import { NavigationTitle } from "@/components/layout/navigation-title";

export function trackHomepageLinkClick(sourcePage: string): void {
  amplitude.track("WPAPIDocsHomepageLinkClicked", { source_page: sourcePage });
}

export function WhitepagesLogoLink() {
  return (
    <span onClick={() => trackHomepageLinkClick(window.location.href)}>
      <NavigationTitle />
    </span>
  );
}
