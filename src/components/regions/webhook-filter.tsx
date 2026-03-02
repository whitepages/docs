import { Radio } from "lucide-react";

interface WebhookFilterProps {
  active: boolean;
  onToggle: () => void;
  count: number;
}

export function WebhookFilter({ active, onToggle, count }: WebhookFilterProps) {
  return (
    <button
      onClick={onToggle}
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
  );
}
