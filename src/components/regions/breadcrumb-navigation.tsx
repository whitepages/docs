import { ChevronRight } from "lucide-react";
import type { BreadcrumbEntry } from "./types";

interface BreadcrumbNavigationProps {
  breadcrumbs: BreadcrumbEntry[];
  onNavigate: (index: number) => void;
}

export function BreadcrumbNavigation({
  breadcrumbs,
  onNavigate,
}: BreadcrumbNavigationProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b bg-fd-muted/30 text-sm">
      {breadcrumbs.map((entry, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <span key={index} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="size-3 text-fd-muted-foreground" />
            )}
            {isLast ? (
              <span className="font-medium">{entry.label}</span>
            ) : (
              <button
                onClick={() => onNavigate(index)}
                className="text-fd-muted-foreground hover:text-fd-foreground transition-colors"
              >
                {entry.label}
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}
