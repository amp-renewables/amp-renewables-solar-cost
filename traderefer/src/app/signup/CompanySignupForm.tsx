"use client";

import { useActionState } from "react";
import { companySignupAction, type CompanySignupState } from "./actions";

const initial: CompanySignupState = {};

export function CompanySignupForm({
  referrerSlug,
}: {
  referrerSlug: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    companySignupAction,
    initial,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.formError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg px-3 py-2">
          {state.formError}
        </div>
      )}

      {/* Hidden field — carries the validated referrer slug into the
          server action. Set server-side from a real Company lookup, so
          even tampering with this input only links to companies that
          actually exist. */}
      {referrerSlug && (
        <input type="hidden" name="referrerSlug" value={referrerSlug} />
      )}

      <Field
        label="Company name"
        name="companyName"
        autoComplete="organization"
        required
        hint="This becomes your URL — /yourcompany"
        error={state.errors?.companyName}
      />
      <Field
        label="Your name"
        name="ownerName"
        autoComplete="name"
        required
        error={state.errors?.ownerName}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={state.errors?.email}
      />
      <Field
        label="Phone"
        name="phone"
        type="tel"
        autoComplete="tel"
        required
        error={state.errors?.phone}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters"
        error={state.errors?.password}
      />

      <button
        type="submit"
        disabled={pending}
        className="w-full btn-primary rounded-lg py-3 font-medium disabled:opacity-60"
      >
        {pending ? "Setting up your account…" : "Start free trial"}
      </button>

      <p className="text-xs text-slate-500 text-center pt-2">
        You can add your logo, brand colours and payout amounts after signing
        up.
      </p>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        {...input}
        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand ${error ? "border-rose-400" : "border-slate-300"}`}
      />
      {error && <span className="text-xs text-rose-600 mt-1">{error}</span>}
      {!error && hint && (
        <span className="text-xs text-slate-500 mt-1">{hint}</span>
      )}
    </label>
  );
}
