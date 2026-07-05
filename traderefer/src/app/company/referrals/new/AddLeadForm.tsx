"use client";

// Admin form for logging an off-platform lead (e.g. one a roofer sent by
// WhatsApp) and attributing it to the partner who sent it. Mirrors the
// partner refer form's field shape, with a partner selector at the top and
// admin-appropriate consent wording. Desktop-first — no sticky mobile bar.

import { useActionState } from "react";
import { addLeadAction, type AddLeadState } from "./actions";

const initial: AddLeadState = {};

export type PartnerOption = {
  id: string;
  label: string;
  isAmbassador: boolean;
};

export function AddLeadForm({
  services,
  partners,
  companyName,
}: {
  services: readonly string[];
  partners: readonly PartnerOption[];
  companyName: string;
}) {
  const [state, formAction, pending] = useActionState(addLeadAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.formError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg px-3 py-2">
          {state.formError}
        </div>
      )}

      {/* ── Attribution ─────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Which partner sent this lead?
          </span>
          <select
            name="partnerId"
            defaultValue=""
            required
            className={`mt-1 block w-full rounded-xl border px-3 py-2.5 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-brand min-h-[48px] ${
              state.errors?.partnerId ? "border-rose-400" : "border-slate-300"
            }`}
          >
            <option value="" disabled>
              Choose a partner…
            </option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
                {p.isAmbassador ? " (Ambassador)" : ""}
              </option>
            ))}
          </select>
          {state.errors?.partnerId && (
            <span className="text-xs text-rose-600">
              {state.errors.partnerId}
            </span>
          )}
          {partners.length === 0 && (
            <span className="mt-1 block text-xs text-slate-500">
              No partners yet — invite the partner first, then log their
              lead.
            </span>
          )}
        </label>
      </div>

      {/* ── The essentials ──────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
        <Field
          label="Customer's name"
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

      {/* ── Services ────────────────────────────────────────────── */}
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

      {/* ── Optional details ────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
        <p className="text-sm font-medium text-slate-700">
          More details{" "}
          <span className="text-slate-400 font-normal">(optional)</span>
        </p>
        <Field
          label="Email"
          name="customerEmail"
          type="email"
          inputMode="email"
          autoComplete="off"
          error={state.errors?.customerEmail}
        />
        <Field label="Address line 1" name="addressLine1" autoComplete="off" />
        <Field label="Address line 2" name="addressLine2" autoComplete="off" />
        <Field label="City / town" name="city" autoComplete="off" />
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Notes</span>
          <textarea
            name="notes"
            rows={3}
            placeholder="How it came in, best time to call, what they said…"
            className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </label>
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
            <strong>The partner has the customer&apos;s permission</strong> to
            share their details with {companyName}.
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

      <button
        type="submit"
        disabled={pending}
        className="w-full btn-primary rounded-xl py-3.5 text-base font-semibold disabled:opacity-60 min-h-[52px]"
      >
        {pending ? "Saving…" : "Log lead"}
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
