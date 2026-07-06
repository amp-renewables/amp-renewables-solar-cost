"use client";

// Public "refer a friend" form — no account needed. The referrer tells us
// who they are (so we can pay them later) and who they're referring. They
// only ever sign up if it pays out.

import { useActionState } from "react";
import {
  submitGoldenTicketReferralAction,
  type GoldenTicketState,
} from "./actions";

const initial: GoldenTicketState = {};

export function GoldenTicketForm({
  slug,
  companyName,
  services,
}: {
  slug: string;
  companyName: string;
  services: readonly string[];
}) {
  const [state, formAction, pending] = useActionState(
    submitGoldenTicketReferralAction,
    initial,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />

      {state.formError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg px-3 py-2">
          {state.formError}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
        <p className="text-sm font-semibold text-brand">Who you&apos;re referring</p>
        <Field
          label="Their name"
          name="customerName"
          autoComplete="off"
          required
          error={state.errors?.customerName}
        />
        <Field
          label="Their mobile"
          name="customerPhone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="07700 900123"
          required
          error={state.errors?.customerPhone}
        />
        <Field
          label="Their postcode"
          name="postcode"
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="NE38 7XX"
          required
          error={state.errors?.postcode}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
        <p className="text-sm font-medium text-slate-700 mb-3">
          What might they be interested in?
        </p>
        <div className="grid grid-cols-2 gap-2">
          {services.map((s) => (
            <label
              key={s}
              className="flex items-center gap-2.5 min-h-[48px] px-3 py-2 border border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 has-[:checked]:border-brand has-[:checked]:bg-brand/5 has-[:checked]:font-medium"
            >
              <input
                type="checkbox"
                name="services"
                value={s}
                className="accent-emerald-700 h-5 w-5 flex-shrink-0"
              />
              <span className="text-sm leading-tight">{s}</span>
            </label>
          ))}
        </div>
        {state.errors?.services && (
          <p className="text-xs text-rose-600 mt-2">{state.errors.services}</p>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
        <p className="text-sm font-semibold text-brand">About you</p>
        <p className="text-xs text-slate-500 -mt-2">
          So {companyName} can pay you if this goes ahead. No account or
          password needed — we&apos;ll only ask you to set one up if there&apos;s
          a reward to collect.
        </p>
        <Field
          label="Your name"
          name="referrerName"
          autoComplete="name"
          required
          error={state.errors?.referrerName}
        />
        <Field
          label="Your mobile"
          name="referrerPhone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          error={state.errors?.referrerPhone}
        />
        <Field
          label="Your email"
          name="referrerEmail"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          error={state.errors?.referrerEmail}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Anything else? (optional)
          </span>
          <textarea
            name="notes"
            rows={2}
            placeholder="Best time to call them, what they're after…"
            className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </label>
      </div>

      <div
        className={`bg-amber-50 border rounded-xl p-4 ${
          state.errors?.consent ? "border-rose-400" : "border-amber-200"
        }`}
      >
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="consent"
            value="1"
            required
            className="mt-0.5 accent-emerald-700 h-5 w-5 flex-shrink-0"
          />
          <span className="text-sm text-amber-900">
            I have their permission to pass their details to{" "}
            <strong>{companyName}</strong>.
          </span>
        </label>
        {state.errors?.consent && (
          <p className="text-xs text-rose-700 mt-2">{state.errors.consent}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full btn-primary rounded-xl py-3.5 text-base font-semibold disabled:opacity-60 min-h-[52px]"
      >
        {pending ? "Sending…" : "Send referral"}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        {...input}
        className={`mt-1 block w-full rounded-xl border px-3 py-2.5 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-brand min-h-[48px] ${
          error ? "border-rose-400" : "border-slate-300"
        }`}
      />
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </label>
  );
}
