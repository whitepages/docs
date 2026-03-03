"use client";

import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { CurlDisplay } from "./curl-display";
import { ResponseDisplay } from "./response-display";

export type StepStatus = "locked" | "active" | "completed";

interface WalkthroughStepProps {
  stepNumber: number;
  title: string;
  children: ReactNode;
  curlCommand: string;
  onExecute: () => void;
  responseData: unknown | null;
  responseStatus: number | null;
  status: StepStatus;
  isLoading: boolean;
  errorMessage: string | null;
}

export function WalkthroughStep({
  stepNumber,
  title,
  children,
  curlCommand,
  onExecute,
  responseData,
  responseStatus,
  status,
  isLoading,
  errorMessage,
}: WalkthroughStepProps) {
  const isLocked = status === "locked";
  const isCompleted = status === "completed";

  return (
    <div
      className={`not-prose border rounded-lg bg-fd-card transition-opacity ${
        isLocked ? "opacity-40 pointer-events-none" : ""
      }`}
    >
      <div className="flex items-center gap-3 px-6 pt-6 pb-4">
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            isCompleted
              ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
              : "bg-fd-primary text-fd-primary-foreground"
          }`}
        >
          {isCompleted ? (
            <svg
              className="w-4 h-4"
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
            stepNumber
          )}
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 pb-6">
        <div className="space-y-4 text-sm text-fd-muted-foreground">
          {children}
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start space-y-3">
          <CurlDisplay command={curlCommand} />

          {!isLocked && (
            <button
              onClick={onExecute}
              disabled={isLoading || isCompleted}
              className={buttonVariants({ variant: "primary" })}
            >
              {isLoading
                ? "Executing..."
                : isCompleted
                  ? "Completed"
                  : "Execute"}
            </button>
          )}

          {errorMessage && (
            <div className="rounded-md p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300">
                {errorMessage}
              </p>
            </div>
          )}

          {responseData !== null && responseStatus !== null && (
            <ResponseDisplay data={responseData} statusCode={responseStatus} />
          )}
        </div>
      </div>
    </div>
  );
}
