"use client";

import { useActionState } from "react";
import { partnerSignupAction, type PartnerSignupState } from "./actions";

const initial: PartnerSignupState = {};

export function PartnerSignupForm({
  slug,
  inviteToken,
}: {
  slug: string;
  inviteToken?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    partnerSignupAction,
    initial,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      {inviteToken && (
        <input type="hidden" name="inviteToken" value={inviteToken} />
      )}
      {state.formError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg px-3 py-2">
          {state.formError}
        </div>
      )}

      <Field label="Your name" name="fullName" required error={state.errors?.fullName} />
      <Field label="Business name" name="businessName" required error={state.errors?.businessName} />
      <Field label="Email" name="email" type="email" required error={state.errors?.email} />
      <Field label="Phone" name="phone" type="tel" required error={state.errors?.phone} />
      <Field label="Password" name="password" type="password" required hint="At least 8 characters" error={state.errors?.password} />

      <button
        type="submit"
        disabled={pending}
        className="w-full btn-primary rounded-lg py-3 font-medium disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create my account"}
      </button>
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
