"use client";

import { useActionState, useState } from "react";
import {
  joinProgrammeAction,
  partnerSignupAction,
  type PartnerSignupState,
} from "./actions";

const initial: PartnerSignupState = {};

type ReferrerType = "BUSINESS_PARTNER" | "AMBASSADOR";

// Radio-card picker for "what kind of referrer are you?". Rendered only
// when the company accepts both types — otherwise the forms below emit a
// hidden input for the single allowed type. No per-card payout figures:
// both types earn the same, and the headline already states it.
function TypePicker({
  value,
  onChange,
}: {
  value: ReferrerType;
  onChange: (t: ReferrerType) => void;
}) {
  const options: {
    type: ReferrerType;
    title: string;
    blurb: string;
  }[] = [
    {
      type: "BUSINESS_PARTNER",
      title: "I'm a business",
      blurb:
        "Tradesman, accountant, estate agent — anyone whose customers could use this.",
    },
    {
      type: "AMBASSADOR",
      title: "I'm referring as myself",
      blurb: "Past customer, friend or neighbour — no business needed.",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup">
      {options.map((opt) => {
        const selected = value === opt.type;
        return (
          <button
            key={opt.type}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.type)}
            className={`text-left rounded-xl border-2 p-4 transition-colors cursor-pointer ${
              selected
                ? "border-brand bg-slate-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <span className="block font-semibold text-sm text-brand">
              {opt.title}
            </span>
            <span className="block text-xs text-slate-500 mt-1">
              {opt.blurb}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function PartnerSignupForm({
  slug,
  inviteToken,
  allowBusiness,
  allowAmbassador,
}: {
  slug: string;
  inviteToken?: string | null;
  allowBusiness: boolean;
  allowAmbassador: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    partnerSignupAction,
    initial,
  );
  const showPicker = allowBusiness && allowAmbassador;
  const [type, setType] = useState<ReferrerType>(
    allowBusiness ? "BUSINESS_PARTNER" : "AMBASSADOR",
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="referrerType" value={type} />
      {inviteToken && (
        <input type="hidden" name="inviteToken" value={inviteToken} />
      )}
      {state.formError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg px-3 py-2">
          {state.formError}
        </div>
      )}

      {showPicker && <TypePicker value={type} onChange={setType} />}

      <Field label="Your name" name="fullName" required error={state.errors?.fullName} />
      {type === "BUSINESS_PARTNER" && (
        <Field
          label="Business name (optional)"
          name="businessName"
          hint="Leave blank if you're referring as yourself"
          error={state.errors?.businessName}
        />
      )}
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

// Shown instead of the signup form when someone with an existing account
// (partner elsewhere, company admin, anyone) views this page logged in
// and ISN'T yet part of this programme. One click adds the membership —
// no second account, no password.
export function JoinProgrammeForm({
  slug,
  companyName,
  inviteToken,
  allowBusiness,
  allowAmbassador,
}: {
  slug: string;
  companyName: string;
  inviteToken?: string | null;
  allowBusiness: boolean;
  allowAmbassador: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    joinProgrammeAction,
    initial,
  );
  const showPicker = allowBusiness && allowAmbassador;
  const [type, setType] = useState<ReferrerType>(
    allowBusiness ? "BUSINESS_PARTNER" : "AMBASSADOR",
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="referrerType" value={type} />
      {inviteToken && (
        <input type="hidden" name="inviteToken" value={inviteToken} />
      )}
      {state.formError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg px-3 py-2">
          {state.formError}
        </div>
      )}

      {showPicker && <TypePicker value={type} onChange={setType} />}

      <button
        type="submit"
        disabled={pending}
        className="w-full btn-primary rounded-lg py-3 font-medium disabled:opacity-60"
      >
        {pending
          ? "Joining…"
          : `Join ${companyName}'s programme`}
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
