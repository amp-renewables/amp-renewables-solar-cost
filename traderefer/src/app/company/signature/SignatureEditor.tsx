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
