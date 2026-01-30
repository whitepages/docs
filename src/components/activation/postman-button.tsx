"use client";

import { buttonVariants } from "@/components/ui/button";

export function PostmanButton() {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = "/docs/postman/whitepages-api-collection.json";
    link.download = "Whitepages-API-Collection.json";
    link.click();
  };

  return (
    <div className="not-prose border rounded-lg p-6 bg-fd-card my-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <svg
            className="w-12 h-12 text-[#FF6C37]"
            viewBox="0 0 256 256"
            fill="currentColor"
          >
            <path d="M254.953 144.253c8.959-8.904 8.959-23.34 0-32.244L175.916 32.802c-8.959-8.904-23.488-8.904-32.447 0L64.235 111.693c-8.959 8.904-8.959 23.34 0 32.244l79.234 79.207c8.959 8.904 23.488 8.904 32.447 0l79.037-78.891zM97.523 162.831l-17.645-17.645 52.445-52.445 17.645 17.645-52.445 52.445z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">Get Postman Collection</h3>
          <p className="text-sm text-fd-muted-foreground mb-4">
            Download our pre-configured Postman collection with example requests
            for Person Search and Property Search endpoints. Just import it into
            Postman and add your API key.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDownload}
              className={buttonVariants({
                variant: "primary",
              })}
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download Collection
            </button>
            <a
              href="https://learning.postman.com/docs/getting-started/importing-and-exporting-data/#importing-data-into-postman"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({
                variant: "outline",
              })}
            >
              How to Import
              <svg
                className="w-4 h-4 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
