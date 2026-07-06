"use client";

import { useState } from "react";
import { deleteInviteAction, retryInviteAction } from "./actions";

type InviteRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  channel: "SMS" | "EMAIL";
  status: "PENDING" | "SENT" | "FAILED" | "SIGNED_UP";
  sentAt: string | null;
  signedUpAt: string | null;
  failReason: string | null;
};

const STATUS_BADGE: Record<InviteRow["status"], { text: string; classes: string }> = {
  PENDING: { text: "Waiting", classes: "bg-slate-100 text-slate-700" },
  SENT: { text: "Invited", classes: "bg-sky-100 text-sky-800" },
  FAILED: { text: "Failed", classes: "bg-rose-100 text-rose-800" },
  SIGNED_UP: { text: "Signed up", classes: "bg-emerald-100 text-emerald-800" },
};

type Filter = "ALL" | InviteRow["status"];

export function InviteTable({ invites }: { invites: InviteRow[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");

  const visible =
    filter === "ALL" ? invites : invites.filter((i) => i.status === filter);

  if (invites.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
        No contacts yet — paste some in above to get started.
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Your list ({invites.length})
        </h2>
        <div className="flex gap-1 text-xs">
          {(["ALL", "PENDING", "SENT", "SIGNED_UP", "FAILED"] as Filter[]).map(
            (f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg border ${
                  filter === f
                    ? "bg-brand text-white border-transparent"
                    : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f === "ALL"
                  ? "All"
                  : STATUS_BADGE[f as InviteRow["status"]].text}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2 hidden sm:table-cell">Channel</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 hidden md:table-cell">When</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((invite) => (
              <tr key={invite.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {invite.name || "(no name)"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {invite.channel === "SMS" ? invite.phone : invite.email}
                  </div>
                  {invite.failReason && (
                    <div className="text-xs text-rose-600 mt-1">
                      {invite.failReason}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-slate-600 text-xs">
                  {invite.channel === "SMS" ? "Text" : "Email"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[invite.status].classes}`}
                  >
                    {STATUS_BADGE[invite.status].text}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">
                  {invite.signedUpAt
                    ? `Joined ${new Date(invite.signedUpAt).toLocaleDateString("en-GB")}`
                    : invite.sentAt
                      ? `Sent ${new Date(invite.sentAt).toLocaleDateString("en-GB")}`
                      : "—"}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {invite.status === "FAILED" && (
                    <form action={retryInviteAction} className="inline">
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <button
                        type="submit"
                        className="text-xs text-brand underline mr-3"
                      >
                        Retry
                      </button>
                    </form>
                  )}
                  {invite.status !== "SIGNED_UP" && (
                    <form action={deleteInviteAction} className="inline">
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <button
                        type="submit"
                        className="text-xs text-slate-400 underline hover:text-rose-600"
                      >
                        Remove
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-slate-500 text-sm"
                >
                  Nothing with that status.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
