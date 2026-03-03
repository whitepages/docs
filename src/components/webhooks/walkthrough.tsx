"use client";

import { useReducer, useCallback } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { WalkthroughStep, type StepStatus } from "./walkthrough-step";

interface StepState {
  responseData: unknown | null;
  responseStatus: number | null;
  isLoading: boolean;
  errorMessage: string | null;
}

interface WalkthroughState {
  apiKey: string;
  webhookUrl: string;
  webhookId: string | null;
  eventId: string | null;
  steps: [StepState, StepState, StepState];
}

type Action =
  | { type: "SET_API_KEY"; apiKey: string }
  | { type: "SET_WEBHOOK_URL"; webhookUrl: string }
  | { type: "STEP_LOADING"; step: number }
  | {
      type: "STEP_SUCCESS";
      step: number;
      data: unknown;
      status: number;
    }
  | {
      type: "STEP_ERROR";
      step: number;
      message: string;
      data?: unknown;
      status?: number;
    }
  | { type: "SET_WEBHOOK_ID"; webhookId: string }
  | { type: "SET_EVENT_ID"; eventId: string }
  | { type: "RESET" };

const INITIAL_STEP: StepState = {
  responseData: null,
  responseStatus: null,
  isLoading: false,
  errorMessage: null,
};

const INITIAL_STATE: WalkthroughState = {
  apiKey: "",
  webhookUrl: "",
  webhookId: null,
  eventId: null,
  steps: [{ ...INITIAL_STEP }, { ...INITIAL_STEP }, { ...INITIAL_STEP }],
};

function reducer(state: WalkthroughState, action: Action): WalkthroughState {
  switch (action.type) {
    case "SET_API_KEY":
      return { ...state, apiKey: action.apiKey };

    case "SET_WEBHOOK_URL":
      return { ...state, webhookUrl: action.webhookUrl };

    case "STEP_LOADING": {
      const steps = [...state.steps] as WalkthroughState["steps"];
      steps[action.step] = {
        ...steps[action.step],
        isLoading: true,
        errorMessage: null,
      };
      return { ...state, steps };
    }

    case "STEP_SUCCESS": {
      const steps = [...state.steps] as WalkthroughState["steps"];
      steps[action.step] = {
        ...steps[action.step],
        responseData: action.data,
        responseStatus: action.status,
        isLoading: false,
        errorMessage: null,
      };
      return { ...state, steps };
    }

    case "STEP_ERROR": {
      const steps = [...state.steps] as WalkthroughState["steps"];
      steps[action.step] = {
        ...steps[action.step],
        isLoading: false,
        errorMessage: action.message,
        responseData: action.data ?? steps[action.step].responseData,
        responseStatus: action.status ?? steps[action.step].responseStatus,
      };
      return { ...state, steps };
    }

    case "SET_WEBHOOK_ID":
      return { ...state, webhookId: action.webhookId };

    case "SET_EVENT_ID":
      return { ...state, eventId: action.eventId };

    case "RESET":
      return {
        ...INITIAL_STATE,
        apiKey: state.apiKey,
        webhookUrl: state.webhookUrl,
        steps: [{ ...INITIAL_STEP }, { ...INITIAL_STEP }, { ...INITIAL_STEP }],
      };
  }
}

function getErrorMessage(status: number, data: unknown): string {
  switch (status) {
    case 401:
      return "Invalid API key.";
    case 403:
      return "Your API key does not have webhook access. Contact api@whitepages.com to request access.";
    case 422: {
      const message =
        data &&
        typeof data === "object" &&
        "message" in data &&
        typeof (data as { message: unknown }).message === "string"
          ? (data as { message: string }).message
          : "Validation error";
      return message;
    }
    case 429:
      return "Rate limit exceeded. Wait a moment and try again.";
    default:
      return `Request failed (${status})`;
  }
}

function getStepStatus(stepIndex: number, state: WalkthroughState): StepStatus {
  const hasApiKey = state.apiKey.trim().length > 0;
  const hasValidUrl = state.webhookUrl.trim().startsWith("https://");
  const step = state.steps[stepIndex];
  const isSuccess =
    step.responseStatus !== null &&
    step.responseStatus >= 200 &&
    step.responseStatus < 300;

  if (isSuccess) return "completed";

  switch (stepIndex) {
    case 0:
      return hasApiKey && hasValidUrl ? "active" : "locked";
    case 1:
      return state.webhookId ? "active" : "locked";
    case 2:
      return state.eventId ? "active" : "locked";
    default:
      return "locked";
  }
}

export function WebhookWalkthrough() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const createCurl = `curl -X POST 'https://api.whitepages.com/v1/webhooks/' \\
  --header 'X-Api-Key: ${state.apiKey || "YOUR_API_KEY"}' \\
  --header 'Content-Type: application/json' \\
  --data '{
    "url": "${state.webhookUrl || "https://your-endpoint.com/webhooks"}",
    "event_type": "deed.*",
    "region": "county:tx.dallas",
    "name": "Quickstart Webhook"
  }'`;

  const testCurl = `curl -X POST 'https://api.whitepages.com/v1/webhooks/${state.webhookId || "WEBHOOK_ID"}/test' \\
  --header 'X-Api-Key: ${state.apiKey || "YOUR_API_KEY"}' \\
  --header 'Content-Type: application/json' \\
  --data '{}'`;

  const eventCurl = `curl 'https://api.whitepages.com/v1/events/${state.eventId || "EVENT_ID"}' \\
  --header 'X-Api-Key: ${state.apiKey || "YOUR_API_KEY"}'`;

  const executeStep = useCallback(
    async (step: number) => {
      dispatch({ type: "STEP_LOADING", step });

      let url: string;
      let options: RequestInit;

      switch (step) {
        case 0:
          url = "/docs/api/webhook-proxy/webhooks/";
          options = {
            method: "POST",
            headers: {
              "X-Api-Key": state.apiKey.trim(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: state.webhookUrl.trim(),
              event_type: "deed.*",
              region: "county:tx.dallas",
              name: "Quickstart Webhook",
            }),
          };
          break;

        case 1:
          url = `/docs/api/webhook-proxy/webhooks/${state.webhookId}/test`;
          options = {
            method: "POST",
            headers: {
              "X-Api-Key": state.apiKey.trim(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          };
          break;

        case 2:
          url = `/docs/api/webhook-proxy/events/${state.eventId}`;
          options = {
            method: "GET",
            headers: {
              "X-Api-Key": state.apiKey.trim(),
            },
          };
          break;

        default:
          return;
      }

      try {
        const response = await fetch(url, options);
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          dispatch({
            type: "STEP_ERROR",
            step,
            message: getErrorMessage(response.status, data),
            data,
            status: response.status,
          });
          return;
        }

        dispatch({
          type: "STEP_SUCCESS",
          step,
          data,
          status: response.status,
        });

        if (step === 0 && data?.result?.id) {
          dispatch({ type: "SET_WEBHOOK_ID", webhookId: data.result.id });
        }

        if (step === 1 && data?.payload?.event_id) {
          dispatch({ type: "SET_EVENT_ID", eventId: data.payload.event_id });
        }
      } catch {
        dispatch({
          type: "STEP_ERROR",
          step,
          message: "Unable to connect. Check your internet connection.",
        });
      }
    },
    [state.apiKey, state.webhookUrl, state.webhookId, state.eventId],
  );

  const handleReset = useCallback(async () => {
    if (state.webhookId && state.apiKey) {
      try {
        await fetch(`/docs/api/webhook-proxy/webhooks/${state.webhookId}`, {
          method: "DELETE",
          headers: { "X-Api-Key": state.apiKey.trim() },
        });
      } catch {
        // Best-effort cleanup
      }
    }
    dispatch({ type: "RESET" });
  }, [state.webhookId, state.apiKey]);

  const allComplete = state.steps.every(
    (step) =>
      step.responseStatus !== null &&
      step.responseStatus >= 200 &&
      step.responseStatus < 300,
  );

  return (
    <div className="not-prose space-y-6">
      <div className="border rounded-lg p-6 bg-fd-card space-y-4">
        <h3 className="text-lg font-semibold">Configuration</h3>
        <p className="text-sm text-fd-muted-foreground">
          Enter your API key and the HTTPS endpoint where you want to receive
          webhook deliveries. Both are only used for requests made from this
          page.
        </p>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="walkthrough-api-key"
              className="block text-sm font-medium mb-1"
            >
              API Key
            </label>
            <input
              id="walkthrough-api-key"
              type="password"
              value={state.apiKey}
              onChange={(event) =>
                dispatch({ type: "SET_API_KEY", apiKey: event.target.value })
              }
              placeholder="Paste your API key here"
              className="w-full max-w-md px-3 py-2 border rounded-md bg-fd-background text-fd-foreground focus:outline-none focus:ring-2 focus:ring-fd-ring"
            />
          </div>
          <div>
            <label
              htmlFor="walkthrough-webhook-url"
              className="block text-sm font-medium mb-1"
            >
              Webhook URL
            </label>
            <input
              id="walkthrough-webhook-url"
              type="url"
              value={state.webhookUrl}
              onChange={(event) =>
                dispatch({
                  type: "SET_WEBHOOK_URL",
                  webhookUrl: event.target.value,
                })
              }
              placeholder="https://your-endpoint.com/webhooks"
              className="w-full max-w-md px-3 py-2 border rounded-md bg-fd-background text-fd-foreground focus:outline-none focus:ring-2 focus:ring-fd-ring"
            />
            {state.webhookUrl.trim().length > 0 &&
              !state.webhookUrl.trim().startsWith("https://") && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  The URL must use HTTPS.
                </p>
              )}
          </div>
        </div>
      </div>

      <WalkthroughStep
        stepNumber={1}
        title="Create Webhook"
        curlCommand={createCurl}
        onExecute={() => executeStep(0)}
        responseData={state.steps[0].responseData}
        responseStatus={state.steps[0].responseStatus}
        status={getStepStatus(0, state)}
        isLoading={state.steps[0].isLoading}
        errorMessage={state.steps[0].errorMessage}
      >
        <p>
          A webhook subscription tells the API to send notifications to your
          HTTPS endpoint whenever matching events occur in a region. This
          request creates a subscription for all deed events (
          <code className="text-xs bg-fd-muted px-1 py-0.5 rounded">
            deed.*
          </code>
          ) in Dallas County, TX.
        </p>
        <div className="space-y-2">
          <p className="font-medium text-fd-foreground">Request body:</p>
          <ul className="space-y-1.5 list-none pl-0">
            <li>
              <code className="text-xs bg-fd-muted px-1 py-0.5 rounded">
                url
              </code>{" "}
              — Your HTTPS endpoint that receives webhook deliveries. The API
              sends POST requests to this URL when events occur.
            </li>
            <li>
              <code className="text-xs bg-fd-muted px-1 py-0.5 rounded">
                event_type
              </code>{" "}
              — The event pattern to subscribe to.{" "}
              <code className="text-xs bg-fd-muted px-1 py-0.5 rounded">
                deed.*
              </code>{" "}
              matches all deed events (transfers, recordings, etc.).
            </li>
            <li>
              <code className="text-xs bg-fd-muted px-1 py-0.5 rounded">
                region
              </code>{" "}
              — The geographic area to monitor, in{" "}
              <code className="text-xs bg-fd-muted px-1 py-0.5 rounded">
                type:value
              </code>{" "}
              format.
            </li>
            <li>
              <code className="text-xs bg-fd-muted px-1 py-0.5 rounded">
                name
              </code>{" "}
              — An optional label to identify this subscription when you have
              multiple webhooks.
            </li>
          </ul>
        </div>
        <p>
          The response includes the created webhook with its{" "}
          <code className="text-xs bg-fd-muted px-1 py-0.5 rounded">id</code>,
          which you will use in the next step to send a test delivery.
        </p>
      </WalkthroughStep>

      <WalkthroughStep
        stepNumber={2}
        title="Test Webhook"
        curlCommand={testCurl}
        onExecute={() => executeStep(1)}
        responseData={state.steps[1].responseData}
        responseStatus={state.steps[1].responseStatus}
        status={getStepStatus(1, state)}
        isLoading={state.steps[1].isLoading}
        errorMessage={state.steps[1].errorMessage}
      >
        <p>
          A test delivery sends a mock event notification to your webhook
          endpoint. This verifies your server can receive and process webhook
          payloads without waiting for a real deed event to occur.
        </p>
        <div className="space-y-2">
          <p className="font-medium text-fd-foreground">
            What happens during a test:
          </p>
          <ul className="space-y-1.5 list-none pl-0">
            <li>
              The API sends a POST request to your webhook URL with a mock event
              payload containing an{" "}
              <code className="text-xs bg-fd-muted px-1 py-0.5 rounded">
                event_id
              </code>
              ,{" "}
              <code className="text-xs bg-fd-muted px-1 py-0.5 rounded">
                event_type
              </code>
              , and a{" "}
              <code className="text-xs bg-fd-muted px-1 py-0.5 rounded">
                links
              </code>{" "}
              array.
            </li>
            <li>
              Your endpoint should respond with a 2xx status code to acknowledge
              receipt.
            </li>
            <li>
              The response from this API call tells you whether delivery
              succeeded, including the status code and response time from your
              server.
            </li>
          </ul>
        </div>
        <p>
          The{" "}
          <code className="text-xs bg-fd-muted px-1 py-0.5 rounded">
            payload.event_id
          </code>{" "}
          from the response is used in the next step to retrieve the full mock
          event.
        </p>
      </WalkthroughStep>

      <WalkthroughStep
        stepNumber={3}
        title="Retrieve Event"
        curlCommand={eventCurl}
        onExecute={() => executeStep(2)}
        responseData={state.steps[2].responseData}
        responseStatus={state.steps[2].responseStatus}
        status={getStepStatus(2, state)}
        isLoading={state.steps[2].isLoading}
        errorMessage={state.steps[2].errorMessage}
      >
        <p>
          When your endpoint receives a webhook notification, it includes a link
          to fetch the full event details. This final step retrieves that event
          using the Events API, completing the lifecycle.
        </p>
        <div className="space-y-2">
          <p className="font-medium text-fd-foreground">
            The event payload includes:
          </p>
          <ul className="space-y-1.5 list-none pl-0">
            <li>
              <code className="text-xs bg-fd-muted px-1 py-0.5 rounded">
                jurisdiction
              </code>{" "}
              — The county and state where the deed was recorded, along with the
              FIPS code.
            </li>
            <li>
              <code className="text-xs bg-fd-muted px-1 py-0.5 rounded">
                property
              </code>{" "}
              — Address, parcel ID, geolocation, square footage, and other
              property attributes.
            </li>
            <li>
              <code className="text-xs bg-fd-muted px-1 py-0.5 rounded">
                parties
              </code>{" "}
              — Grantors and grantees involved in the deed transaction, with
              names, roles, and addresses.
            </li>
            <li>
              <code className="text-xs bg-fd-muted px-1 py-0.5 rounded">
                detail
              </code>{" "}
              — Document type, recorded date, consideration amount, and
              transaction reason.
            </li>
          </ul>
        </div>
        <p>
          This is the same data structure you would receive for real deed
          events. The mock event uses synthetic data, but the shape is identical
          to production events.
        </p>
      </WalkthroughStep>

      {allComplete && (
        <div className="border rounded-lg p-6 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
            Walkthrough complete
          </h3>
          <p className="text-sm text-green-700 dark:text-green-300 mb-4">
            You have successfully created a webhook, tested delivery, and
            retrieved the full event payload. You are ready to integrate
            webhooks into your application.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/docs/documentation/webhooks/create-webhook"
              className="text-green-700 dark:text-green-300 underline underline-offset-2"
            >
              Create Webhook guide
            </Link>
            <Link
              href="/docs/documentation/events/event-payload"
              className="text-green-700 dark:text-green-300 underline underline-offset-2"
            >
              Event payload reference
            </Link>
            <Link
              href="/docs/documentation/events/event-types"
              className="text-green-700 dark:text-green-300 underline underline-offset-2"
            >
              Event types
            </Link>
          </div>
        </div>
      )}

      {(state.webhookId || state.steps.some((step) => step.responseData)) && (
        <div className="flex justify-end">
          <button
            onClick={handleReset}
            className={buttonVariants({ variant: "outline" })}
          >
            Reset Walkthrough
          </button>
        </div>
      )}
    </div>
  );
}
