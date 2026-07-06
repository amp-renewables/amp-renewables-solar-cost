"use client";

import { useActionState, useState } from "react";
import {
  uploadCompanyLogoAction,
  clearCompanyLogoAction,
  type UploadState,
} from "./upload";

const initial: UploadState = {};

export function LogoUpload({
  currentLogoUrl,
  currentLogoUrlLight,
  companyName,
}: {
  currentLogoUrl: string | null;
  currentLogoUrlLight: string | null;
  companyName: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-6">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Logo
        </h2>
        <p className="text-xs text-slate-500 mt-2">
          We use two versions — one for light pages (your landing page
          header, receipts) and one for dark surfaces (your partner sign-up
          panel and admin navigation). If you only have one logo, upload
          it as your standard and we&apos;ll fall back to your company
          name on dark surfaces.
        </p>
      </div>

      <LogoSlot
        variant="standard"
        label="Standard logo"
        description="Shown on light backgrounds — your landing page header, settings, emails."
        previewBg="bg-slate-50"
        previewBorder="border-slate-200"
        currentUrl={currentLogoUrl}
        companyName={companyName}
      />

      <LogoSlot
        variant="light"
        label="Light logo (for dark backgrounds)"
        description="Shown on dark surfaces — your partner sign-up panel and admin nav. Upload a white / inverted version of your logo on a TRANSPARENT background — not on its own dark / black backdrop, or you'll see that backdrop sitting on top of your brand colour. The preview tile to the left renders against your brand colour so you can check it looks right before saving."
        previewBg="bg-brand"
        previewBorder="border-slate-300"
        currentUrl={currentLogoUrlLight}
        companyName={companyName}
      />
    </div>
  );
}

function LogoSlot({
  variant,
  label,
  description,
  previewBg,
  previewBorder,
  currentUrl,
  companyName,
}: {
  variant: "standard" | "light";
  label: string;
  description: string;
  previewBg: string;
  previewBorder: string;
  currentUrl: string | null;
  companyName: string;
}) {
  const [state, action, pending] = useActionState(
    uploadCompanyLogoAction,
    initial,
  );
  // Local preview of a freshly picked file (before submit).
  const [preview, setPreview] = useState<string | null>(null);

  // Only show this slot's state messages (if a user uploads both slots,
  // the global useActionState fires for both — we filter by variant).
  const isMine = state.variant === variant;

  return (
    <div className="space-y-3 pt-4 border-t border-slate-100 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-sm font-medium text-slate-800">{label}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>

      <div className="flex items-center gap-6 flex-wrap">
        <div
          className={`h-20 w-40 rounded-lg border ${previewBorder} ${previewBg} flex items-center justify-center overflow-hidden`}
        >
          {preview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={preview}
              alt="Preview"
              className="max-h-full max-w-full object-contain"
            />
          ) : currentUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={currentUrl}
              alt={companyName}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span
              className={`text-xs text-center px-2 ${
                variant === "light" ? "text-white/60" : "text-slate-400"
              }`}
            >
              No logo
              <br />
              uploaded
            </span>
          )}
        </div>

        <form action={action} className="flex-1 min-w-[260px] space-y-3">
          <input type="hidden" name="variant" value={variant} />
          <input
            type="file"
            name="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            required
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) {
                const reader = new FileReader();
                reader.onload = () =>
                  setPreview(
                    typeof reader.result === "string" ? reader.result : null,
                  );
                reader.readAsDataURL(f);
              } else {
                setPreview(null);
              }
            }}
            className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
          />
          <p className="text-xs text-slate-500">
            PNG, JPEG, WEBP or SVG. Max 4 MB.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="submit"
              disabled={pending}
              className="btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {pending ? "Uploading…" : "Upload"}
            </button>
            {currentUrl && (
              // Uses formAction to point this submit at the clear action
              // instead of nesting a second <form>. The hidden 'variant'
              // input above is shared between both submit paths so the
              // server action knows which slot to clear.
              //
              // formNoValidate is critical: the file <input> above is
              // marked required, which normally blocks form submit when
              // empty. The clear action doesn't need a file at all, so
              // we bypass HTML5 validation for this submit path only.
              // Without this, 'Remove' silently fails until you also
              // pick a new file — which defeats the point.
              <button
                type="submit"
                formAction={clearCompanyLogoAction}
                formNoValidate
                className="text-sm text-rose-700 underline px-3 py-2"
              >
                Remove
              </button>
            )}
          </div>
        </form>
      </div>

      {isMine && state.error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg px-3 py-2 text-sm">
          {state.error}
        </div>
      )}
      {isMine && state.ok && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2 text-sm">
          ✓ {state.ok}
        </div>
      )}
    </div>
  );
}
