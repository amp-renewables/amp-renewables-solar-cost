"use client";

// Client-only submit button that intercepts the click with a native
// confirm() dialog. Sits inside the existing delete <form> so it doesn't
// need its own state — the form-action wiring stays in the server page.

export function ConfirmDeleteButton() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (
          !confirm(
            "Permanently delete this referral and all its payouts? This can't be undone.",
          )
        ) {
          e.preventDefault();
        }
      }}
      className="w-full rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800 hover:bg-rose-100"
    >
      Delete permanently
    </button>
  );
}
