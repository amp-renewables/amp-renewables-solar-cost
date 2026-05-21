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
  companyName,
}: {
  currentLogoUrl: string | null;
  companyName: string;
}) {
  const [state, action, pending] = useActionState(
    uploadCompanyLogoAction,
    initial,
  );
  // Local preview of a freshly picked file (before submit).
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
        Logo
      </h2>

      <div className="flex items-center gap-6 flex-wrap">
        <div
          className="h-20 w-40 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden"
        >
          {preview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={preview}
              alt="Preview"
              className="max-h-full max-w-full object-contain"
            />
          ) : currentLogoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={currentLogoUrl}
              alt={companyName}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="text-xs text-slate-400 text-center px-2">
              No logo
              <br />
              uploaded
            </span>
          )}
        </div>

        <form action={action} className="flex-1 min-w-[260px] space-y-3">
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
                  setPreview(typeof reader.result === "string" ? reader.result : null);
                reader.readAsDataURL(f);
              } else {
                setPreview(null);
              }
            }}
            className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
          />
          <p className="text-xs text-slate-500">
            PNG, JPEG, WEBP or SVG. Max 4 MB. Aim for a transparent
            background so it sits nicely on your landing page.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="submit"
              disabled={pending}
              className="btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {pending ? "Uploading…" : "Upload logo"}
            </button>
            {currentLogoUrl && (
              <button
                type="submit"
                formAction={clearCompanyLogoAction}
                className="text-sm text-rose-700 underline px-3 py-2"
              >
                Remove current logo
              </button>
            )}
          </div>
        </form>
      </div>

      {state.error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg px-3 py-2 text-sm">
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2 text-sm">
          ✓ {state.ok}
        </div>
      )}
    </div>
  );
}
