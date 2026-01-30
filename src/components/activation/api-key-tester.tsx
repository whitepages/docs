"use client";

import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";

interface ApiResponse {
  success: boolean;
  message: string;
  details?: string;
  data?: unknown;
  status?: number;
}

const MOCK_DATA = [
  {
    id: "P1234567890",
    name: "John Smith",
    age_range: "35-44",
    current_addresses: [
      {
        id: "A9876543210",
        address: "123 Main St, Seattle, WA 98101",
        is_current: true,
      },
    ],
    phones: [
      {
        number: "(206) 555-0198",
        type: "mobile",
        is_primary: true,
      },
    ],
    emails: [
      {
        address: "john.smith@email.com",
        is_primary: true,
      },
    ],
  },
];

interface ApiKeyTesterProps {
  mockMode?: boolean;
}

export function ApiKeyTester({ mockMode = false }: ApiKeyTesterProps) {
  const [apiKey, setApiKey] = useState(mockMode ? "demo-api-key-xxxxx" : "");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(
    mockMode
      ? {
          success: true,
          message: "Success! Your API key is working.",
          data: MOCK_DATA,
          status: 200,
        }
      : null,
  );

  const testApiKey = async () => {
    if (!apiKey.trim()) {
      setResponse({
        success: false,
        message: "Please enter an API key",
      });
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      const result = await fetch(
        "/docs/api/test-proxy?name=John%20Smith&city=Seattle&state_code=WA",
        {
          headers: {
            "X-Api-Key": apiKey.trim(),
          },
        },
      );

      const data = await result.json().catch(() => null);

      if (result.ok) {
        setResponse({
          success: true,
          message: "Success! Your API key is working.",
          data,
          status: result.status,
        });
      } else if (result.status === 403) {
        setResponse({
          success: false,
          message: "Invalid API key",
          details:
            "The API key you entered is not valid. Please check your email for the correct API key.",
          status: result.status,
        });
      } else if (result.status === 429) {
        setResponse({
          success: false,
          message: "Rate limit exceeded",
          details:
            "Your API key is valid but you've exceeded the rate limit. Wait a moment and try again.",
          status: result.status,
        });
      } else {
        setResponse({
          success: false,
          message: `Request failed (${result.status})`,
          details: data?.message || "An unexpected error occurred.",
          data,
          status: result.status,
        });
      }
    } catch {
      setResponse({
        success: false,
        message: "Connection error",
        details:
          "Unable to connect to the API. Please check your internet connection and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !isLoading) {
      testApiKey();
    }
  };

  return (
    <div className="not-prose border rounded-lg p-6 bg-fd-card">
      <h3 className="text-lg font-semibold mb-4">Try It Now</h3>
      <p className="text-sm text-fd-muted-foreground mb-4">
        Enter your API key below to make a test request and see real results.
      </p>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="api-key-input"
            className="block text-sm font-medium mb-2"
          >
            API Key
          </label>
          <input
            id="api-key-input"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste your API key here"
            className="w-full px-3 py-2 border rounded-md bg-fd-background text-fd-foreground focus:outline-none focus:ring-2 focus:ring-fd-ring"
            disabled={isLoading}
          />
        </div>

        <button
          onClick={testApiKey}
          disabled={isLoading || !apiKey.trim()}
          className={buttonVariants({
            variant: "primary",
          })}
        >
          {isLoading ? "Sending Request..." : "Send Request"}
        </button>

        {response && (
          <div
            className={`rounded-md p-4 ${
              response.success
                ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {response.success ? (
                  <svg
                    className="w-5 h-5 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h4
                  className={`text-sm font-semibold ${
                    response.success
                      ? "text-green-800 dark:text-green-200"
                      : "text-red-800 dark:text-red-200"
                  }`}
                >
                  {response.message}
                </h4>
                {response.details && (
                  <p
                    className={`text-sm mt-1 ${
                      response.success
                        ? "text-green-700 dark:text-green-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    {response.details}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {response?.data !== undefined && (
          <div className="pt-4">
            <h4 className="text-sm font-medium mb-2">Response Data</h4>
            <pre className="bg-fd-muted p-4 rounded-md overflow-auto text-xs max-h-[400px]">
              <code>{JSON.stringify(response.data, null, 2)}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
