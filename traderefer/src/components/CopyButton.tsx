"use client";

import { useState } from "react";

export function CopyButton({
  value,
  label = "Copy",
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // ignored — non-secure contexts
        }
      }}
      className={`btn-primary text-sm px-3 py-1.5 rounded-md ${className}`}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
