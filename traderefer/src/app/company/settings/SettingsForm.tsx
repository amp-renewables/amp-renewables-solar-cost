"use client";

import { useActionState } from "react";
import { saveCompanySettings, type SettingsState } from "./actions";

type Props = {
  company: {
    name: string;
    contactEmail: string;
    contactPhone: string | null;
    websiteUrl: string | null;
    addressLine: string | null;
    heroSubheading: string | null;
    primaryColor: string;
    accentColor: string;
    payoutAppointment: number;
    payoutJob: number;
    services: string[];
  };
};

const initial: SettingsState = {};

export function SettingsForm({ company }: Props) {
  const [state, action, pending] = useActionState(saveCompanySettings, initial);

  return (
    <form action={action} className="space-y-6">
      {state.ok && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2 text-sm">
          ✓ Settings saved.
        </div>
      )}
      {state.formError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg px-3 py-2 text-sm">
          {state.formError}
        </div>
      )}

      <Section title="Company">
        <Field label="Company name" name="name" defaultValue={company.name} required error={state.errors?.name} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Contact email" name="contactEmail" type="email" defaultValue={company.contactEmail} required error={state.errors?.contactEmail} />
          <Field label="Contact phone" name="contactPhone" type="tel" defaultValue={company.contactPhone ?? ""} error={state.errors?.contactPhone} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Website (optional)" name="websiteUrl" defaultValue={company.websiteUrl ?? ""} placeholder="https://" />
          <Field label="Footer address (optional)" name="addressLine" defaultValue={company.addressLine ?? ""} />
        </div>
      </Section>

      <Section title="Landing page">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Hero subheading (optional)
          </span>
          <textarea
            name="heroSubheading"
            rows={3}
            defaultValue={company.heroSubheading ?? ""}
            placeholder="The short pitch that appears under your hero headline on your /yourcompany page."
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <ColorField
            label="Primary colour"
            name="primaryColor"
            defaultValue={company.primaryColor}
            error={state.errors?.primaryColor}
          />
          <ColorField
            label="Accent colour"
            name="accentColor"
            defaultValue={company.accentColor}
            error={state.errors?.accentColor}
          />
        </div>
      </Section>

      <Section title="Payouts &amp; services">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Payout per appointment booked (£)"
            name="payoutAppointment"
            type="number"
            step="0.01"
            defaultValue={String(company.payoutAppointment)}
            required
            error={state.errors?.payoutAppointment}
          />
          <Field
            label="Payout per job sold (£)"
            name="payoutJob"
            type="number"
            step="0.01"
            defaultValue={String(company.payoutJob)}
            required
            error={state.errors?.payoutJob}
          />
        </div>
        <Field
          label="Services (comma separated)"
          name="servicesCsv"
          defaultValue={company.services.join(", ")}
          required
          hint="What you cover, e.g. Solar PV, Battery Storage, EV Charger"
          error={state.errors?.servicesCsv}
        />
      </Section>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary rounded-lg px-6 py-3 font-medium disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save settings"}
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
      <h2
        className="text-sm font-semibold uppercase tracking-wider text-slate-500"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {children}
    </div>
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
        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm ${error ? "border-rose-400" : "border-slate-300"}`}
      />
      {error && <span className="text-xs text-rose-600">{error}</span>}
      {!error && hint && (
        <span className="text-xs text-slate-500 mt-1 block">{hint}</span>
      )}
    </label>
  );
}

function ColorField({
  label,
  name,
  defaultValue,
  error,
}: {
  label: string;
  name: string;
  defaultValue: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          name={name + "_picker"}
          defaultValue={defaultValue}
          onChange={(e) => {
            const text = e.currentTarget
              .closest("label")
              ?.querySelector(`input[name="${name}"]`) as HTMLInputElement | null;
            if (text) text.value = e.currentTarget.value;
          }}
          className="h-9 w-12 rounded border border-slate-300 cursor-pointer"
        />
        <input
          type="text"
          name={name}
          defaultValue={defaultValue}
          required
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-mono ${error ? "border-rose-400" : "border-slate-300"}`}
        />
      </div>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </label>
  );
}
