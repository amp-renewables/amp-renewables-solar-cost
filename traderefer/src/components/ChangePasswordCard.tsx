"use client";

import { useActionState } from "react";
import {
  changePasswordAction,
  type ChangePasswordState,
} from "@/lib/account-actions";

const initial: ChangePasswordState = {};

export function ChangePasswordCard() {
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
        Change password
      </h2>
      <form action={action} className="space-y-4">
        {state.formError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg px-3 py-2 text-sm">
            {state.formError}
          </div>
        )}
        {state.ok && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2 text-sm">
            ✓ {state.ok}
          </div>
        )}
        <Field
          label="Current password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          error={state.errors?.currentPassword}
        />
        <Field
          label="New password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 8 characters"
          error={state.errors?.newPassword}
        />
        <Field
          label="Confirm new password"
          name="confirmNewPassword"
          type="password"
          autoComplete="new-password"
          required
          error={state.errors?.confirmNewPassword}
        />
        <button
          type="submit"
          disabled={pending}
          className="btn-primary px-5 py-2 rounded-lg font-medium disabled:opacity-60"
        >
          {pending ? "Updating…" : "Change password"}
        </button>
      </form>
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
