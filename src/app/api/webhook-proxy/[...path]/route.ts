import { NextRequest, NextResponse } from "next/server";

const ALLOWED_PREFIXES = ["webhooks", "events"];

function isAllowedPath(path: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
  method: string,
) {
  const { path } = await params;
  const joinedPath = path.join("/");

  if (!isAllowedPath(joinedPath)) {
    return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
  }

  const apiKey = request.headers.get("X-Api-Key");
  const url = `https://api.whitepages.com/v1/${joinedPath}`;

  const fetchOptions: RequestInit = {
    method,
    headers: {
      "X-Api-Key": apiKey || "",
      "Content-Type": "application/json",
    },
  };

  if (method !== "GET") {
    const body = await request.text();
    if (body) {
      fetchOptions.body = body;
    }
  }

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to API" },
      { status: 502 },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, context, "GET");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, context, "POST");
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, context, "DELETE");
}
