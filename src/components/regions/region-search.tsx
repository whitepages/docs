"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Fuse, { type IFuseOptions } from "fuse.js";
import { Loader2 } from "lucide-react";
import {
  BrowseLevel,
  RegionLevel,
  type BreadcrumbEntry,
  type RegionEntry,
} from "./types";
import { SearchInput } from "./search-input";
import { BreadcrumbNavigation } from "./breadcrumb-navigation";
import { RegionRow } from "./region-row";

const FUSE_OPTIONS: IFuseOptions<RegionEntry> = {
  keys: ["name", "slug", "state_code", "fips_code", "stateName"],
  threshold: 0.3,
};

const ROOT_BREADCRUMB: BreadcrumbEntry = {
  label: "States",
  level: BrowseLevel.States,
};

export function RegionSearch() {
  const [regions, setRegions] = useState<RegionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([
    ROOT_BREADCRUMB,
  ]);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  const currentBreadcrumb = breadcrumbs[breadcrumbs.length - 1];

  useEffect(() => {
    fetch("/docs/api/regions?type=all")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load regions");
        return response.json();
      })
      .then((data) => {
        setRegions(data.results ?? data);
        setLoading(false);
      })
      .catch((fetchError) => {
        setError(fetchError.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search]);

  const states = useMemo(
    () => regions.filter((region) => region.level === RegionLevel.State),
    [regions],
  );

  const fuse = useMemo(() => new Fuse(regions, FUSE_OPTIONS), [regions]);

  const query = debouncedSearch.trim();
  const isSearching = query.length > 0;

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const results = fuse.search(query, { limit: 50 }).map((r) => r.item);
    results.sort((a, b) => {
      if (a.level === b.level) return 0;
      return a.level === RegionLevel.State ? -1 : 1;
    });
    return results;
  }, [isSearching, fuse, query]);

  const browseItems = useMemo(() => {
    if (isSearching) return [];
    if (currentBreadcrumb.level === BrowseLevel.States) return states;
    return regions.filter(
      (region) =>
        region.level === RegionLevel.County &&
        region.stateCode === currentBreadcrumb.stateCode,
    );
  }, [isSearching, currentBreadcrumb, states, regions]);

  function clearSearch() {
    setSearch("");
    setDebouncedSearch("");
  }

  function drillDown(item: RegionEntry) {
    clearSearch();
    setBreadcrumbs((previous) => [
      ...previous,
      {
        label: item.name,
        level: BrowseLevel.Counties,
        stateCode: item.state_code,
      },
    ]);
  }

  function navigateToState(stateCode: string) {
    const state = states.find((s) => s.state_code === stateCode);
    if (!state) return;
    clearSearch();
    setBreadcrumbs([
      ROOT_BREADCRUMB,
      { label: state.name, level: BrowseLevel.Counties, stateCode },
    ]);
  }

  function navigateTo(index: number) {
    clearSearch();
    setBreadcrumbs((previous) => previous.slice(0, index + 1));
  }

  const canDrillDown = currentBreadcrumb.level === BrowseLevel.States;

  if (loading) {
    return (
      <div className="not-prose border rounded-lg bg-fd-card overflow-hidden">
        <div className="flex items-center justify-center gap-2 py-8 text-fd-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading regions...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="not-prose border rounded-lg bg-fd-card overflow-hidden">
        <div className="py-8 text-center text-red-600 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  const items = isSearching ? searchResults : browseItems;

  return (
    <div className="not-prose border rounded-lg bg-fd-card overflow-hidden">
      <SearchInput value={search} onChange={setSearch} />

      {!isSearching && (
        <BreadcrumbNavigation
          breadcrumbs={breadcrumbs}
          onNavigate={navigateTo}
        />
      )}

      <div className="max-h-[400px] overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-sm text-fd-muted-foreground text-center py-8">
            No results found.
          </p>
        ) : (
          <div>
            {items.map((item) => (
              <RegionRow
                key={item.slug}
                region={item}
                showParent={isSearching && item.level === RegionLevel.County}
                showChevron={isSearching || canDrillDown}
                onClick={
                  isSearching
                    ? () =>
                        item.level === RegionLevel.State
                          ? drillDown(item)
                          : item.stateCode
                            ? navigateToState(item.stateCode)
                            : undefined
                    : canDrillDown
                      ? () => drillDown(item)
                      : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
