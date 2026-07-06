"use client";

// Compact copy-to-clipboard button for the referral URL on
// /company/network. Just plain text — we don't need rich-text semantics
// here (the rich version lives in the email signature feature).

import { useState } from "react";

export function CopyButton({
  content,
  label,
}: {
  content: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(content);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // Fallback for old browsers — leave the state alone so the
          // user knows the click didn't take.
        }
      }}
      className="btn-primary px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap"
    >
      {copied ? "✓ Copied" : label}
    </button>
  );
}
