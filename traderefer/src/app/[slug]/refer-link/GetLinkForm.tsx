"use client";

// "Get your referral link" form. Someone enters just their own details and
// gets a personal shareable link back — no account, no password. On success
// we show the link with copy + WhatsApp share so they can forward it
// immediately.

import { useActionState, useState } from "react";
import { getReferralLinkAction, type GetLinkState } from "./actions";

const initial: GetLinkState = {};

export function GetLinkForm({
  slug,
  companyName,
}: {
  slug: string;
  companyName: string;
}) {
  const [state, formAction, pending] = useActionState(
    getReferralLinkAction,
    initial,
  );

  if (state.ok && state.referUrl) {
    return <LinkReady referUrl={state.referUrl} companyName={companyName} />;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />

      {state.formError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg px-3 py-2">
          {state.formError}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
        <Field
          label="Your name"
          name="fullName"
          autoComplete="name"
          required
          error={state.errors?.fullName}
        />
        <Field
          label="Your mobile"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          error={state.errors?.phone}
        />
        <Field
          label="Your email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          error={state.errors?.email}
        />
      </div>

      <div
        className={`bg-amber-50 border rounded-xl p-4 ${
          state.errors?.consent ? "border-rose-400" : "border-amber-200"
        }`}
      >
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="consent"
            value="1"
            required
            className="mt-0.5 accent-emerald-700 h-5 w-5 flex-shrink-0"
          />
          <span className="text-sm text-amber-900">
            I&apos;m happy for <strong>{companyName}</strong> to contact me
            about my link and any reward I earn.
          </span>
        </label>
        {state.errors?.consent && (
          <p className="text-xs text-rose-700 mt-2">{state.errors.consent}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full btn-primary rounded-xl py-3.5 text-base font-semibold disabled:opacity-60 min-h-[52px]"
      >
        {pending ? "Creating your link…" : "Get my link"}
      </button>
    </form>
  );
}

function LinkReady({
  referUrl,
  companyName,
}: {
  referUrl: string;
  companyName: string;
}) {
  const [copied, setCopied] = useState(false);
  const shareText = `I've used ${companyName} — worth a look. Get a free survey here:`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${referUrl}`)}`;

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="font-semibold text-brand">Your referral link is ready</p>
        <p className="text-sm text-slate-600 mt-1">
          Share this with anyone who might want {companyName}. We&apos;ve also
          emailed and texted it to you so you don&apos;t lose it.
        </p>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <code className="text-sm bg-slate-100 text-slate-700 rounded-lg px-3 py-2 break-all flex-1 min-w-[200px]">
            {referUrl}
          </code>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(referUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                /* non-secure context — ignore */
              }
            }}
            className="btn-primary text-sm px-4 py-2 rounded-lg whitespace-nowrap"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>

      <a
        href={whatsapp}
        target="_blank"
        rel="noopener"
        className="block w-full text-center btn-primary rounded-xl py-3.5 text-base font-semibold"
      >
        Share on WhatsApp
      </a>

      <p className="text-sm text-slate-600 text-center">
        Nothing else to do — when a referral pays out we&apos;ll message you to
        claim your reward.
      </p>
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
        className={`mt-1 block w-full rounded-xl border px-3 py-2.5 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-brand min-h-[48px] ${
          error ? "border-rose-400" : "border-slate-300"
        }`}
      />
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </label>
  );
}
