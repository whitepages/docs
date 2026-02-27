import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://api.whitepages.com/v1/regions";

enum RegionLevel {
  State = "state",
  County = "county",
}

interface Region {
  name: string;
  slug: string;
  state_code?: string;
  fips_code?: string;
}

interface RegionEntry {
  name: string;
  slug: string;
  state_code?: string;
  fips_code?: string;
  level: RegionLevel;
  stateName?: string;
  stateCode?: string;
}

async function fetchAllRegions(): Promise<RegionEntry[]> {
  const statesResponse = await fetch(`${BASE_URL}/states`);
  if (!statesResponse.ok) throw new Error("Failed to load states");
  const statesData = await statesResponse.json();
  const states: Region[] = statesData.results ?? statesData;

  const statesWithCodes = states.filter(
    (state): state is Region & { state_code: string } =>
      typeof state.state_code === "string",
  );

  const stateEntries: RegionEntry[] = statesWithCodes.map((state) => ({
    ...state,
    level: RegionLevel.State,
  }));

  const countyBatches = await Promise.all(
    statesWithCodes.map(async (state) => {
      try {
        const response = await fetch(
          `${BASE_URL}/states/${encodeURIComponent(state.state_code)}/counties`,
        );
        if (!response.ok) return [];
        const data = await response.json();
        const counties: Region[] = data.results ?? data;
        return counties.map(
          (county): RegionEntry => ({
            ...county,
            level: RegionLevel.County,
            stateName: state.name,
            stateCode: state.state_code,
          }),
        );
      } catch {
        return [];
      }
    }),
  );

  return [...stateEntries, ...countyBatches.flat()];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type === "all") {
    try {
      const results = await fetchAllRegions();
      return NextResponse.json({ results });
    } catch {
      return NextResponse.json(
        { error: "Failed to load regions" },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(
    { error: "Invalid request. Use type=all" },
    { status: 400 },
  );
}
