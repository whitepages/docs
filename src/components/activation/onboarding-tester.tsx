"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import amplitude from "@/lib/amplitude";

// Decode a `?token=<value>` query param back into the user's API key. The
// token is URL-safe base64 of the key with no padding. Returns null when
// the param is absent, malformed, or decodes to something that doesn't
// look like a printable key — never throws so a bad link can't break the
// page.
function decodeApiKeyFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const standard = token.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (standard.length % 4)) % 4);
    const decoded = atob(standard + padding);
    // Gate on printable ASCII (no whitespace, no control chars, no high
    // bits). `atob` will happily decode any valid base64, including
    // base64 of binary data — this check confirms the result actually
    // looks like a key string before we paste it into the input.
    if (!decoded || !/^[\x21-\x7E]+$/.test(decoded)) return null;
    return decoded;
  } catch {
    return null;
  }
}

interface ApiResponse {
  success: boolean;
  message: string;
  details?: string;
  data?: unknown;
  status?: number;
}

type Endpoint = "person" | "property";

interface FieldConfig {
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
}

interface SectionConfig {
  id: string;
  title: string;
  description: string;
  endpoint: Endpoint;
  fields: FieldConfig[];
  guideHref: string;
  guideLabel: string;
}

const SECTIONS: SectionConfig[] = [
  {
    id: "person_search",
    title: "Search for a Person",
    description:
      "Find a person by name. Narrow results with city, state, or street.",
    endpoint: "person",
    fields: [
      {
        name: "name",
        label: "Full name",
        placeholder: "John Smith",
        required: true,
      },
      {
        name: "city",
        label: "City",
        placeholder: "Seattle",
        required: false,
      },
      {
        name: "state_code",
        label: "State",
        placeholder: "WA",
        required: false,
      },
      {
        name: "street",
        label: "Street",
        placeholder: "123 Main St",
        required: false,
      },
    ],
    guideHref: "/documentation/person-search",
    guideLabel: "Read the Person Search guide",
  },
  {
    id: "reverse_phone",
    title: "Look Up a Phone Number",
    description: "Find the person associated with a phone number.",
    endpoint: "person",
    fields: [
      {
        name: "phone",
        label: "Phone number",
        placeholder: "2065550198",
        required: true,
      },
    ],
    guideHref: "/documentation/person-search/reverse-phone-lookup",
    guideLabel: "Read the Reverse Phone Lookup guide",
  },
  {
    id: "property_search",
    title: "Search for a Property",
    description: "Get ownership and resident data for any address.",
    endpoint: "property",
    fields: [
      {
        name: "street",
        label: "Street",
        placeholder: "1600 Pennsylvania Ave NW",
        required: true,
      },
      {
        name: "city",
        label: "City",
        placeholder: "Washington",
        required: false,
      },
      {
        name: "state_code",
        label: "State",
        placeholder: "DC",
        required: true,
      },
    ],
    guideHref: "/documentation/property-search",
    guideLabel: "Read the Property Search guide",
  },
];

function buildParams(values: Record<string, string>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    const trimmed = value.trim();
    if (trimmed) params.set(key, trimmed);
  }
  return params;
}

/** Sniff the result count from the V2 response shape.
 *
 * Person Search V2 returns ``{ results: [...], metadata: { result_count } }``;
 * Property Search V2 returns ``{ result: {...} }`` (singular). Returns
 * ``undefined`` when the shape doesn't match either, so Amplitude doesn't
 * record a misleading zero. */
function countResults(data: unknown): number | undefined {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const metadata = obj.metadata;
    if (metadata && typeof metadata === "object") {
      const count = (metadata as Record<string, unknown>).result_count;
      if (typeof count === "number") return count;
    }
    if (Array.isArray(obj.results)) return obj.results.length;
    if (obj.result && typeof obj.result === "object") return 1;
  }
  return undefined;
}

function classifyError(status: number | undefined, body: unknown): ApiResponse {
  if (status === 403) {
    return {
      success: false,
      message: "Invalid API key",
      details:
        "The API key you entered is not valid. Please check your email for the correct API key.",
      status,
    };
  }
  if (status === 429) {
    return {
      success: false,
      message: "Usage limit reached",
      details:
        "Your API key is valid, but you've hit a usage limit. This may be a rate limit (try again in a moment) or the overall quota for your key (which resets per billing period).",
      status,
    };
  }
  if (status === 404) {
    return {
      success: false,
      message: "No results found",
      details:
        "Your API key is working, but no records matched your search. Try different search parameters.",
      status,
    };
  }
  const message =
    (body as { message?: string } | null)?.message ??
    "An unexpected error occurred.";
  return {
    success: false,
    message: `Request failed (${status ?? "?"})`,
    details: message,
    data: body,
    status,
  };
}

interface SectionTesterProps {
  config: SectionConfig;
  apiKey: string;
}

function SectionTester({ config, apiKey }: SectionTesterProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(config.fields.map((field) => [field.name, ""])),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  const missingRequired = config.fields
    .filter((field) => field.required)
    .some((field) => values[field.name].trim() === "");
  const canSubmit = apiKey.trim() !== "" && !missingRequired;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsLoading(true);
    setResponse(null);

    const params = buildParams(values);
    amplitude.track("WPAPIDocsOnboardingTestSent", {
      section: config.id,
      params: Object.fromEntries(params),
    });

    try {
      const result = await fetch(
        `/docs/api/test-proxy/${config.endpoint}?${params.toString()}`,
        { headers: { "X-Api-Key": apiKey.trim() } },
      );
      const data = await result.json().catch(() => null);
      const resultCount = result.ok ? countResults(data) : undefined;

      if (result.ok) {
        amplitude.track("WPAPIDocsOnboardingTestResult", {
          section: config.id,
          success: true,
          status: result.status,
          result_count: resultCount,
        });
        setResponse({
          success: true,
          message: "Success! Your request returned data.",
          data,
          status: result.status,
        });
      } else {
        const classified = classifyError(result.status, data);
        amplitude.track("WPAPIDocsOnboardingTestResult", {
          section: config.id,
          success: false,
          status: result.status,
          error:
            result.status === 403
              ? "invalid_key"
              : result.status === 429
                ? "rate_limited"
                : result.status === 404
                  ? "no_results"
                  : "request_failed",
        });
        setResponse(classified);
      }
    } catch {
      amplitude.track("WPAPIDocsOnboardingTestResult", {
        section: config.id,
        success: false,
        error: "connection_error",
      });
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
    if (event.key === "Enter" && canSubmit && !isLoading) {
      handleSubmit();
    }
  };

  const handleGuideClick = () => {
    amplitude.track("WPAPIDocsOnboardingGuideClick", {
      section: config.id,
    });
  };

  return (
    <section className="border rounded-lg p-6 bg-fd-card">
      <h3 className="text-lg font-semibold mb-1">{config.title}</h3>
      <p className="text-sm text-fd-muted-foreground mb-4">
        {config.description}
      </p>

      <div className="space-y-3">
        {config.fields.map((field) => (
          <div key={field.name}>
            <label
              htmlFor={`${config.id}-${field.name}`}
              className="block text-sm font-medium mb-1"
            >
              {field.label}
              {field.required && (
                <span className="text-red-500" aria-hidden="true">
                  {" "}
                  *
                </span>
              )}
            </label>
            <input
              id={`${config.id}-${field.name}`}
              type="text"
              value={values[field.name]}
              onChange={(event) =>
                setValues({ ...values, [field.name]: event.target.value })
              }
              onKeyDown={handleKeyDown}
              placeholder={field.placeholder}
              required={field.required}
              className="w-full px-3 py-2 border rounded-md bg-fd-background text-fd-foreground focus:outline-none focus:ring-2 focus:ring-fd-ring"
              disabled={isLoading}
            />
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            onClick={handleSubmit}
            disabled={isLoading || !canSubmit}
            className={buttonVariants({ variant: "primary" })}
          >
            {isLoading ? "Sending Request..." : "Send Request"}
          </button>
          <Link
            href={config.guideHref}
            onClick={handleGuideClick}
            className="text-sm text-fd-primary hover:underline"
          >
            {config.guideLabel} →
          </Link>
        </div>

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
    </section>
  );
}

export function OnboardingTester() {
  const [apiKey, setApiKey] = useState("");
  const [prefilledFromLink, setPrefilledFromLink] = useState(false);

  // Defer the URL-param read to useEffect so SSR and the first client
  // render agree (both empty) — avoids a hydration mismatch warning.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const decoded = decodeApiKeyFromToken(params.get("token"));
    if (decoded) {
      setApiKey(decoded);
      setPrefilledFromLink(true);
    }
  }, []);

  return (
    <div className="not-prose space-y-6">
      <div className="border rounded-lg p-6 bg-fd-card">
        <label
          htmlFor="onboarding-api-key"
          className="block text-sm font-medium mb-2"
        >
          API Key
        </label>
        <input
          id="onboarding-api-key"
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="Paste your API key here"
          className="w-full px-3 py-2 border rounded-md bg-fd-background text-fd-foreground focus:outline-none focus:ring-2 focus:ring-fd-ring"
        />
        {prefilledFromLink ? (
          <p className="text-sm text-fd-muted-foreground mt-2">
            API key auto-filled from your link — this is your trial key. You can
            edit it below if needed. It&apos;s shared across all use cases
            below.
          </p>
        ) : (
          <p className="text-sm text-fd-muted-foreground mt-2">
            Your API key is shared across all use cases below.
          </p>
        )}
      </div>

      {SECTIONS.map((config) => (
        <SectionTester key={config.id} config={config} apiKey={apiKey} />
      ))}
    </div>
  );
}
