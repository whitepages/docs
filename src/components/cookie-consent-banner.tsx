"use client";

import { useEffect, useState } from "react";
import { getConsent, setConsent } from "@/lib/consent";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsent() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  function handleAccept() {
    setConsent("accepted");
    setVisible(false);
  }

  function handleDecline() {
    setConsent("declined");
    setVisible(false);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-fd-border bg-fd-card p-4 text-fd-foreground shadow-lg">
      <div className="mx-auto flex max-w-screen-xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <p className="text-sm">
          We use cookies to analyze site usage and improve your experience. You
          can accept or decline analytics cookies.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
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
