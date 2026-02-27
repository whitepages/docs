import { ChevronRight } from "lucide-react";
import type { RegionEntry } from "./types";

interface RegionRowProps {
  region: RegionEntry;
  showParent?: boolean;
  showChevron?: boolean;
  onClick?: () => void;
}

export function RegionRow({
  region,
  showParent = false,
  showChevron = false,
  onClick,
}: RegionRowProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between w-full px-4 py-2.5 text-left border-b last:border-b-0 transition-colors ${
        onClick ? "hover:bg-fd-accent cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-medium truncate">{region.name}</span>
        {showParent && region.stateName && (
          <span className="text-xs text-fd-muted-foreground shrink-0">
            {region.stateName}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0 pl-4">
        <span className="text-xs text-fd-muted-foreground font-mono">
          {region.slug}
        </span>
        {region.fips_code && (
          <span className="text-xs text-fd-muted-foreground font-mono">
            {region.fips_code}
          </span>
        )}
        {showChevron && (
          <ChevronRight className="size-4 text-fd-muted-foreground" />
        )}
      </div>
    </button>
  );
}
