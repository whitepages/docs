"use client";

interface ResponseDisplayProps {
  data: unknown;
  statusCode: number;
}

export function ResponseDisplay({ data, statusCode }: ResponseDisplayProps) {
  const isSuccess = statusCode >= 200 && statusCode < 300;

  return (
    <div
      className={`rounded-md border ${
        isSuccess
          ? "border-green-200 dark:border-green-800"
          : "border-red-200 dark:border-red-800"
      }`}
    >
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-t-md text-xs font-medium ${
          isSuccess
            ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
            : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
        }`}
      >
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            isSuccess ? "bg-green-500" : "bg-red-500"
          }`}
        />
        {statusCode} {isSuccess ? "OK" : "Error"}
      </div>
      <pre className="bg-fd-muted p-4 rounded-b-md overflow-auto text-xs max-h-[400px] leading-relaxed">
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre>
    </div>
  );
}
