"use client";

import { Radio } from "lucide-react";
import amplitude from "@/lib/amplitude";

interface WebhookFilterProps {
  active: boolean;
  onToggle: () => void;
  count: number;
  eventTypes: string[];
  selectedEventType: string | null;
  onEventTypeChange: (eventType: string | null) => void;
}

export function WebhookFilter({
  active,
  onToggle,
  count,
  eventTypes,
  selectedEventType,
  onEventTypeChange,
}: WebhookFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => {
          amplitude.track("WPAPIDocsWebhookFilterToggled", {
            enabled: !active,
          });
          onToggle();
        }}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
          active
            ? "bg-fd-primary text-fd-primary-foreground"
            : "bg-fd-secondary text-fd-muted-foreground hover:text-fd-foreground"
        }`}
      >
        <Radio className="size-3" />
        Webhooks only
        {active && <span>({count})</span>}
      </button>
      {active && eventTypes.length > 1 && (
        <>
          {eventTypes.map((eventType) => (
            <button
              key={eventType}
              onClick={() => {
                const newValue =
                  selectedEventType === eventType ? null : eventType;
                amplitude.track("WPAPIDocsWebhookEventTypeSelected", {
                  event_type: newValue,
                });
                onEventTypeChange(newValue);
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded-full transition-colors ${
                selectedEventType === eventType
                  ? "bg-fd-primary text-fd-primary-foreground"
                  : "bg-fd-muted text-fd-muted-foreground hover:text-fd-foreground"
              }`}
            >
              {eventType}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
