"use client";

import { useActionState } from "react";
import {
  forgotPasswordAction,
  type ForgotPasswordState,
} from "./actions";

const initial: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    forgotPasswordAction,
    initial,
  );

  if (state.ok) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg px-4 py-3 text-sm">
        ✓ If an account with that email exists, you&apos;ll get a reset link in
        the next minute or two. Check spam if it doesn&apos;t turn up.
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand ${state.errors?.email ? "border-rose-400" : "border-slate-300"}`}
        />
        {state.errors?.email && (
          <span className="text-xs text-rose-600">{state.errors.email}</span>
        )}
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full btn-primary rounded-lg py-3 font-medium disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
