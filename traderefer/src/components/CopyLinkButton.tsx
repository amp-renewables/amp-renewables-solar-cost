"use client";

import { useRef, useState } from "react";

// One-click copy for the partner signup link — the single thing company
// admins share most. Plain-text clipboard write; falls back silently if
// the browser refuses (the link is still visible to select by hand).
export function CopyLinkButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <button
      type="button"
      onClick={async () => {
        let ok = false;
        try {
          await navigator.clipboard.writeText(value);
          ok = true;
        } catch {
          // Async clipboard refused (permissions, older browser) — fall
          // back to the selection-based copy, which only needs the click.
          const ta = document.createElement("textarea");
          ta.value = value;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          try {
            ok = document.execCommand("copy");
          } finally {
            ta.remove();
          }
        }
        if (ok) {
          setCopied(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 2000);
        }
      }}
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
        copied
          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {copied ? "Copied ✓" : "Copy link"}
    </button>
  );
}
