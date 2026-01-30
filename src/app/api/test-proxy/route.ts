import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("X-Api-Key");
  const { searchParams } = new URL(request.url);

  const queryString = searchParams.toString();
  const url = `https://api.whitepages.com/v1/person?${queryString}`;

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
