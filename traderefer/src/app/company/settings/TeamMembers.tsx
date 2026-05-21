"use client";

import { useActionState } from "react";
import {
  inviteTeamMemberAction,
  removeTeamMemberAction,
  type InviteState,
} from "./team-actions";

type Member = {
  id: string;
  fullName: string | null;
  email: string;
  isYou: boolean;
};

const initial: InviteState = {};

export function TeamMembers({
  members,
  maxTeamSize,
}: {
  members: Member[];
  maxTeamSize: number;
}) {
  const [state, action, pending] = useActionState(
    inviteTeamMemberAction,
    initial,
  );

  const atLimit = members.length >= maxTeamSize;
  const remaining = Math.max(0, maxTeamSize - members.length);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Team
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Up to {maxTeamSize} admins per company at no extra cost. They get the
          same access to referrals, partners, payouts and settings as you do.
        </p>
      </div>

      <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <div>
              <div className="font-medium">
                {m.fullName || m.email}
                {m.isYou && (
                  <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    You
                  </span>
                )}
              </div>
              {m.fullName && (
                <div className="text-xs text-slate-500">{m.email}</div>
              )}
            </div>
            {!m.isYou && (
              <form action={removeTeamMemberAction}>
                <input type="hidden" name="userId" value={m.id} />
                <button
                  type="submit"
                  className="text-xs text-rose-700 underline"
                >
                  Remove
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>

      {atLimit ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2 text-sm">
          You&apos;ve hit the limit of {maxTeamSize} team members. Remove
          someone above to invite a new one.
        </div>
      ) : (
        <form action={action} className="space-y-3">
          <h3 className="text-sm font-medium text-slate-700">
            Invite a team member ({remaining} slot{remaining === 1 ? "" : "s"} left)
          </h3>
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
          <div className="grid sm:grid-cols-2 gap-3">
            <Field
              label="Name"
              name="fullName"
              required
              error={state.errors?.fullName}
            />
            <Field
              label="Email"
              name="email"
              type="email"
              required
              error={state.errors?.email}
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {pending ? "Sending invite…" : "Send invite"}
          </button>
          <p className="text-xs text-slate-500">
            They&apos;ll get an email with a link to set their password and
            get started.
          </p>
        </form>
      )}
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
        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm ${error ? "border-rose-400" : "border-slate-300"}`}
      />
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </label>
  );
}
