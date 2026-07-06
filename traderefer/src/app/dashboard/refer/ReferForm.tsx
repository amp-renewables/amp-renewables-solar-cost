"use client";

// Mobile-first referral form. Design goal: a tradesman standing outside
// a customer's house can submit in under 30 seconds with one thumb.
//
//   - Required: customer name, mobile, postcode, at least one service.
//   - Everything else (email, street address, notes) lives in a
//     collapsed "Add more details" section — useful when known, never
//     blocking.
//   - Big tap targets (min 44px), correct inputMode/autoComplete so the
//     right keyboard appears, sticky submit bar on small screens so the
//     button is always reachable.

import { useActionState, useState } from "react";
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
  const [detailsOpen, setDetailsOpen] = useState(false);

  // If the server bounced a hidden-field error back, force the optional
  // section open so the message isn't invisible.
  const detailErrors = Boolean(state.errors?.customerEmail);

  return (
    <form action={formAction} className="space-y-4 pb-24 sm:pb-0">
      {state.formError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg px-3 py-2">
          {state.formError}
        </div>
      )}

      {/* ── The essentials ─────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
        <BigField
          label="Customer's name"
          name="customerName"
          autoComplete="off"
          required
          error={state.errors?.customerName}
        />
        <BigField
          label="Their mobile"
          name="customerPhone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="07700 900123"
          required
          error={state.errors?.customerPhone}
        />
        <BigField
          label="Their postcode"
          name="postcode"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="NE38 7XX"
          required
          error={state.errors?.postcode}
        />
      </div>

      {/* ── Services: big tap chips ─────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
        <p className="text-sm font-medium text-slate-700 mb-3">
          What are they interested in?
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

      {/* ── Optional extras, collapsed by default ──────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setDetailsOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <span>
            Add more details{" "}
            <span className="text-slate-400 font-normal">
              — email, address, notes (optional)
            </span>
          </span>
          <span
            className={`text-slate-400 transition-transform ${
              detailsOpen || detailErrors ? "rotate-45" : ""
            }`}
          >
            +
          </span>
        </button>
        {(detailsOpen || detailErrors) && (
          <div className="px-4 sm:px-5 pb-4 space-y-4 border-t border-slate-100 pt-4">
            <BigField
              label="Email (optional)"
              name="customerEmail"
              type="email"
              inputMode="email"
              autoComplete="off"
              error={state.errors?.customerEmail}
            />
            <BigField
              label="Address line 1 (optional)"
              name="addressLine1"
              autoComplete="off"
            />
            <BigField
              label="Address line 2 (optional)"
              name="addressLine2"
              autoComplete="off"
            />
            <BigField
              label="City / town (optional)"
              name="city"
              autoComplete="off"
            />
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Notes (optional)
              </span>
              <textarea
                name="notes"
                rows={3}
                placeholder="Best time to call, what they said, urgency…"
                className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </label>
          </div>
        )}
      </div>

      {/* ── Consent ─────────────────────────────────────────────── */}
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
            className="mt-0.5 accent-emerald-700 h-5 w-5 flex-shrink-0"
          />
          <span className="text-sm text-amber-900">
            <strong>I have the customer&apos;s permission</strong> to share
            their details with {companyName}.
            <span className="block text-xs text-amber-800 mt-1">
              Required by UK data protection law — we record when you
              confirmed this.
            </span>
          </span>
        </label>
        {state.errors?.customerConsentConfirmed && (
          <p className="text-xs text-rose-700 mt-2">
            {state.errors.customerConsentConfirmed}
          </p>
        )}
      </div>

      {/* ── Submit: sticky on mobile so it's always one thumb away ─ */}
      <div className="fixed bottom-0 inset-x-0 p-3 bg-white/95 backdrop-blur border-t border-slate-200 sm:static sm:p-0 sm:bg-transparent sm:border-0 sm:backdrop-blur-none">
        <button
          type="submit"
          disabled={pending}
          className="w-full btn-primary rounded-xl py-3.5 text-base font-semibold disabled:opacity-60 min-h-[52px]"
        >
          {pending ? "Sending…" : "Send referral"}
        </button>
      </div>
    </form>
  );
}

function BigField({
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
