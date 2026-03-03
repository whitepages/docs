"use client";

import { useState } from "react";

interface CurlDisplayProps {
  command: string;
}

export function CurlDisplay({ command }: CurlDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-1 text-xs rounded bg-fd-muted hover:bg-fd-accent transition-colors text-fd-muted-foreground"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre className="bg-fd-muted p-4 rounded-md overflow-auto text-xs leading-relaxed">
        <code>{command}</code>
      </pre>
    </div>
  );
}
