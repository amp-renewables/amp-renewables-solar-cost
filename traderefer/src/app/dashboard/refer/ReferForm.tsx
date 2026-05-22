"use client";

import { useActionState } from "react";
import { submitReferralAction, type ReferState } from "./actions";

const initial: ReferState = {};

export function ReferForm({
  services,
  companyName,
}: {
  services: readonly string[];
  companyName: string;
}) {
  const [state, formAction, pending] = useActionState(
    submitReferralAction,
    initial,
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.formError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg px-3 py-2">
          {state.formError}
        </div>
      )}

      <Section title="Customer">
        <Field
          label="Full name"
          name="customerName"
          required
          error={state.errors?.customerName}
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Phone"
            name="customerPhone"
            type="tel"
            required
            error={state.errors?.customerPhone}
          />
          <Field
            label="Email"
            name="customerEmail"
            type="email"
            required
            error={state.errors?.customerEmail}
          />
        </div>
      </Section>

      <Section title="Address">
        <Field
          label="Address line 1"
          name="addressLine1"
          required
          error={state.errors?.addressLine1}
        />
        <Field label="Address line 2 (optional)" name="addressLine2" />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="City / town"
            name="city"
            required
            error={state.errors?.city}
          />
          <Field
            label="Postcode"
            name="postcode"
            required
            error={state.errors?.postcode}
          />
        </div>
      </Section>

      <Section title="Services they're interested in">
        <div className="grid sm:grid-cols-2 gap-2">
          {services.map((s) => (
            <label
              key={s}
              className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
            >
              <input
                type="checkbox"
                name="services"
                value={s}
                className="accent-emerald-700"
              />
              <span className="text-sm">{s}</span>
            </label>
          ))}
        </div>
        {state.errors?.services && (
          <p className="text-xs text-rose-600 mt-1">{state.errors.services}</p>
        )}
      </Section>

      <Section title="Notes (optional)">
        <textarea
          name="notes"
          rows={4}
          placeholder="Anything we should know — best time to call, roof condition, urgency, etc."
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </Section>

      <div
        className={`bg-amber-50 border rounded-xl p-4 ${
          state.errors?.customerConsentConfirmed
            ? "border-rose-400"
            : "border-amber-200"
        }`}
      >
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="customerConsentConfirmed"
            value="1"
            required
            className="mt-0.5 accent-emerald-700 h-4 w-4 flex-shrink-0"
          />
          <span className="text-sm text-amber-900">
            <strong>I have the customer&apos;s permission</strong> to share
            their name, phone number, email and address with {companyName}.
            <span className="block text-xs text-amber-800 mt-1">
              Required under UK data protection law. We record the date and
              time you confirmed this in case of a complaint.
            </span>
          </span>
        </label>
        {state.errors?.customerConsentConfirmed && (
          <p className="text-xs text-rose-700 mt-2">
            {state.errors.customerConsentConfirmed}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full btn-primary rounded-lg py-3 font-medium disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit referral"}
      </button>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h2>
      {children}
    </div>
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
        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand ${error ? "border-rose-400" : "border-slate-300"}`}
      />
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </label>
  );
}
