"use client";

import { useActionState } from "react";
import {
  resetPasswordAction,
  type ResetPasswordState,
} from "./actions";

const initial: ResetPasswordState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(
    resetPasswordAction,
    initial,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.formError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg px-3 py-2">
          {state.formError}
        </div>
      )}
      <label className="block">
        <span className="text-sm font-medium text-slate-700">New password</span>
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          required
          className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand ${state.errors?.password ? "border-rose-400" : "border-slate-300"}`}
        />
        {state.errors?.password && (
          <span className="text-xs text-rose-600">{state.errors.password}</span>
        )}
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">
          Confirm new password
        </span>
        <input
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand ${state.errors?.confirmPassword ? "border-rose-400" : "border-slate-300"}`}
        />
        {state.errors?.confirmPassword && (
          <span className="text-xs text-rose-600">
            {state.errors.confirmPassword}
          </span>
        )}
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full btn-primary rounded-lg py-3 font-medium disabled:opacity-60"
      >
        {pending ? "Updating…" : "Set new password"}
      </button>
    </form>
  );
}
