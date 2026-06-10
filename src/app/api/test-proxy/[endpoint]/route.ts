import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ENDPOINTS = new Set(["person", "property"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ endpoint: string }> },
) {
  const { endpoint } = await params;
  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 404 });
  }

  const apiKey = request.headers.get("X-Api-Key");
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  const url = `https://api.whitepages.com/v2/${endpoint}?${queryString}`;

  try {
    const response = await fetch(url, {
      headers: {
        "X-Api-Key": apiKey || "",
      },
    });

    const data = await response.json().catch(() => null);

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to API" },
      { status: 502 },
    );
  }
}
