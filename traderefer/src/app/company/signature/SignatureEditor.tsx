"use client";

import { useActionState, useState } from "react";
import {
  saveEmailSignatureAction,
  type SignatureState,
} from "./actions";

const initial: SignatureState = {};

export function SignatureEditor({
  currentTemplate,
  defaultTemplate,
  placeholders,
}: {
  currentTemplate: string;
  defaultTemplate: string;
  placeholders: Array<{ token: string; description: string }>;
}) {
  const [state, action, pending] = useActionState(
    saveEmailSignatureAction,
    initial,
  );

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">
          Signature template
        </label>
        <textarea
          name="emailSignature"
          defaultValue={currentTemplate}
          rows={3}
          maxLength={500}
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <p className="text-xs text-slate-500 mt-2">
          Available placeholders:{" "}
          {placeholders.map((p, i) => (
            <span key={p.token}>
              <code className="bg-slate-100 rounded px-1 py-0.5">
                {p.token}
              </code>
              {i < placeholders.length - 1 ? ", " : ""}
            </span>
          ))}
          . Leave blank to use the default.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save signature"}
        </button>
        <ResetToDefault defaultTemplate={defaultTemplate} />
        {state.error && (
          <span className="text-xs text-rose-700">{state.error}</span>
        )}
        {state.ok && (
          <span className="text-xs text-emerald-700">✓ {state.ok}</span>
        )}
      </div>
    </form>
  );
}

function ResetToDefault({ defaultTemplate }: { defaultTemplate: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        const form = e.currentTarget.closest("form");
        const textarea = form?.querySelector(
          "textarea[name='emailSignature']",
        ) as HTMLTextAreaElement | null;
        if (textarea) {
          textarea.value = defaultTemplate;
        }
      }}
      className="text-xs text-slate-600 underline px-2 py-2 hover:text-brand"
    >
      Reset to default
    </button>
  );
}

export function CopyButton({
  label,
  content,
  variant = "primary",
}: {
  label: string;
  content: string;
  variant?: "primary" | "secondary";
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(content);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Fallback for browsers without Clipboard API (rare). Skip
          // setCopied so the button stays in its idle state.
        }
      }}
      className={
        variant === "primary"
          ? "btn-primary px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
          : "px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 whitespace-nowrap"
      }
    >
      {copied ? "✓ Copied" : label}
    </button>
  );
}

/**
 * Copy a snippet to the clipboard in BOTH text/html and text/plain
 * formats simultaneously. Rich-text editors (Gmail signature box,
 * Outlook web) take the HTML version and render it as formatted text
 * with clickable link — exactly what we want. Plain editors (iOS Mail,
 * text fields) get the plain-text version.
 *
 * Falls back to plain-text-only copy on older browsers that don't
 * support ClipboardItem (rare in 2026 — Chrome 76+, Firefox 116+,
 * Safari 13.1+, Edge 79+).
 */
export function RichCopyButton({
  label,
  html,
  plain,
}: {
  label: string;
  html: string;
  plain: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyRich() {
    try {
      if (
        typeof ClipboardItem !== "undefined" &&
        navigator.clipboard?.write
      ) {
        const item = new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        return;
      }
    } catch (err) {
      // Drop through to plain-text fallback.
      console.warn("[signature] rich copy failed, falling back:", err);
    }
    try {
      await navigator.clipboard.writeText(plain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Older browser without any clipboard API — user has to select
      // and copy manually. The live preview block above the button
      // is selectable so this still works, just less convenient.
    }
  }

  return (
    <button
      type="button"
      onClick={copyRich}
      className="btn-primary px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap"
    >
      {copied ? "✓ Copied — paste into your signature now" : label}
    </button>
  );
}
