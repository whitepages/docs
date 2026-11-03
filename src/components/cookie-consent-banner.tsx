"use client";

import { useEffect, useRef, useState } from "react";
import { ConsentValue, getConsent, setConsent } from "@/lib/consent";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const banner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (getConsent() === null) setVisible(true);
  }, []);

  useEffect(() => {
    const element = banner.current;
    if (!visible || !element) return;
    const update = () =>
      document.documentElement.style.setProperty(
        "--cookie-consent-height",
        `${element.getBoundingClientRect().height}px`,
      );
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--cookie-consent-height");
    };
  }, [visible]);

  if (!visible) return null;

  function handleAccept() {
    setConsent(ConsentValue.Accepted);
    setVisible(false);
  }

  function handleDecline() {
    setConsent(ConsentValue.Declined);
    setVisible(false);
  }

  return (
    <div
      ref={banner}
      data-testid="cookie-consent-banner"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-fd-border bg-fd-card p-4 text-fd-foreground shadow-lg"
    >
      <div className="mx-auto flex max-w-screen-xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <p className="text-sm">
          We use cookies to analyze site usage and improve your experience. You
          can accept or decline ad cookies.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            data-testid="cookie-consent-decline"
            onClick={handleDecline}
            className={cn(buttonVariants({ variant: "outline" }), "px-4 py-2")}
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className={cn(buttonVariants({ variant: "primary" }), "px-4 py-2")}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
