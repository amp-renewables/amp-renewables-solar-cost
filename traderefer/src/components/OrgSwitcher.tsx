"use client";

import { useRef, useTransition } from "react";
import { switchMembershipAction } from "@/lib/account-actions";
import type { MembershipSummary } from "@/lib/auth";

// Dropdown for users who wear more than one hat — partner at one
// company, admin of another, or a superadmin who also holds company
// memberships. Changing the selection re-points the server-side session
// at the chosen membership and lands on that context's home page.
// Rendered by Nav only when there are 2+ contexts to choose from.
export function OrgSwitcher({
  memberships,
  activeMembershipId,
  isSuperadmin,
}: {
  memberships: MembershipSummary[];
  activeMembershipId: string | null;
  isSuperadmin: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form ref={formRef} action={switchMembershipAction}>
      <select
        name="membershipId"
        defaultValue={activeMembershipId ?? "platform"}
        disabled={pending}
        onChange={() =>
          startTransition(() => formRef.current?.requestSubmit())
        }
        aria-label="Switch programme"
        className="bg-white/10 border border-white/20 text-white text-xs rounded-md px-2 py-1.5 max-w-[180px] cursor-pointer disabled:opacity-60 [&>option]:text-slate-900"
      >
        {isSuperadmin && <option value="platform">TradeRefer Platform</option>}
        {memberships.map((m) => (
          <option key={m.id} value={m.id}>
            {m.companyName}
            {m.role === "COMPANY_ADMIN" ? " (admin)" : ""}
          </option>
        ))}
      </select>
    </form>
  );
}
