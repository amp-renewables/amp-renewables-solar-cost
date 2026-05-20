import type { ReferralStatus } from "@prisma/client";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/status";

export function StatusBadge({ status }: { status: ReferralStatus }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
