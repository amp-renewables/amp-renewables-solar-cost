"use client";

import { useActionState } from "react";
import {
  saveProfileAction,
  saveBankAction,
  type SettingsState,
} from "./actions";

const initial: SettingsState = {};

export function ProfileForm({
  fullName,
  businessName,
  phone,
  postcode,
}: {
  fullName: string;
  businessName: string;
  phone: string;
  postcode: string;
}) {
  const [state, action, pending] = useActionState(saveProfileAction, initial);
  return (
    <form
      action={action}
      className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
    >
      {state.ok && <OkBanner text={state.ok} />}
      <Field label="Your name" name="fullName" defaultValue={fullName} required error={state.errors?.fullName} />
      <Field
        label="Business name (optional)"
        name="businessName"
        defaultValue={businessName}
        error={state.errors?.businessName}
      />
      <Field label="Phone" name="phone" type="tel" defaultValue={phone} required error={state.errors?.phone} />
      <Field
        label="Postcode (optional)"
        name="postcode"
        defaultValue={postcode}
        placeholder="NE1 4ST"
        hint="Used to suggest other referral programmes near you — more programmes, more ways to earn."
        error={state.errors?.postcode}
      />
      <button
        type="submit"
        disabled={pending}
        className="btn-primary px-5 py-2 rounded-lg font-medium disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

export function BankForm({
  bankAccountName,
  bankSortCode,
  bankAccountNumber,
}: {
  bankAccountName: string;
  bankSortCode: string;
  bankAccountNumber: string;
}) {
  const [state, action, pending] = useActionState(saveBankAction, initial);
  return (
    <form
      action={action}
      className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
    >
      {state.ok && <OkBanner text={state.ok} />}
      <Field
        label="Account holder name"
        name="bankAccountName"
        defaultValue={bankAccountName}
        required
        error={state.errors?.bankAccountName}
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          label="Sort code"
          name="bankSortCode"
          defaultValue={bankSortCode}
          placeholder="12-34-56"
          required
          error={state.errors?.bankSortCode}
        />
        <Field
          label="Account number"
          name="bankAccountNumber"
          defaultValue={bankAccountNumber}
          placeholder="12345678"
          inputMode="numeric"
          required
          error={state.errors?.bankAccountNumber}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="btn-primary px-5 py-2 rounded-lg font-medium disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save bank details"}
      </button>
    </form>
  );
}

function OkBanner({ text }: { text: string }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2 text-sm">
      ✓ {text}
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
