"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initial: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.formError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg px-3 py-2">
          {state.formError}
        </div>
      )}
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
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand ${state.errors?.password ? "border-rose-400" : "border-slate-300"}`}
        />
        {state.errors?.password && (
          <span className="text-xs text-rose-600">{state.errors.password}</span>
        )}
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full btn-primary rounded-lg py-3 font-medium disabled:opacity-60"
      >
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
