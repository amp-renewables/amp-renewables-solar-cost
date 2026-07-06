"use client";

import { useEffect, useState } from "react";
import { revealPartnerBankDetailsAction } from "./actions";

// How long the revealed details stay on screen before auto-hiding. Short
// enough to discourage shoulder-surfing on a shared laptop; long enough
// for an admin to actually type the numbers into their banking app.
const REVEAL_TIMEOUT_MS = 60_000;

export function MaskedBankCell({
  partnerId,
  accountName,
  sortCodeLast2,
  accountNumberLast4,
}: {
  partnerId: string;
  accountName: string | null;
  sortCodeLast2: string | null;
  accountNumberLast4: string | null;
}) {
  const [state, setState] = useState<
    | { kind: "masked" }
    | { kind: "loading" }
    | { kind: "revealed"; sortCode: string; accountNumber: string; remaining: number }
    | { kind: "error"; message: string }
  >({ kind: "masked" });

  // Auto-hide countdown when revealed. Re-creates on every state change so a
  // second reveal-after-timeout gets its own fresh window.
  useEffect(() => {
    if (state.kind !== "revealed") return;
    const startedAt = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, REVEAL_TIMEOUT_MS - elapsed);
      if (remaining === 0) {
        setState({ kind: "masked" });
      } else {
        setState((s) =>
          s.kind === "revealed" ? { ...s, remaining } : s,
        );
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [state.kind]);

  async function handleReveal() {
    setState({ kind: "loading" });
    try {
      const result = await revealPartnerBankDetailsAction(partnerId);
      if (result.ok) {
        setState({
          kind: "revealed",
          sortCode: result.sortCode,
          accountNumber: result.accountNumber,
          remaining: REVEAL_TIMEOUT_MS,
        });
      } else {
        setState({ kind: "error", message: result.error });
      }
    } catch {
      setState({
        kind: "error",
        message: "Could not load bank details. Try again.",
      });
    }
  }

  if (state.kind === "revealed") {
    return (
      <div className="text-slate-700 font-mono space-y-0.5">
        <div>{accountName}</div>
        <div className="text-slate-900">{state.sortCode}</div>
        <div className="text-slate-900">{state.accountNumber}</div>
        <button
          type="button"
          onClick={() => setState({ kind: "masked" })}
          className="font-sans text-[10px] text-slate-500 underline hover:text-brand mt-1"
        >
          Hide ({Math.ceil(state.remaining / 1000)}s)
        </button>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="space-y-1">
        <span className="text-rose-700 text-xs">{state.message}</span>
        <button
          type="button"
          onClick={() => setState({ kind: "masked" })}
          className="block text-[10px] text-slate-500 underline"
        >
          Reset
        </button>
      </div>
    );
  }

  // Masked (default) or loading
  return (
    <div className="text-slate-700 font-mono space-y-0.5">
      <div>{accountName}</div>
      <div className="text-slate-500">
        {sortCodeLast2 ? `**-**-${sortCodeLast2}` : "**-**-**"}
      </div>
      <div className="text-slate-500">
        {accountNumberLast4 ? `**** ${accountNumberLast4}` : "**** ****"}
      </div>
      <button
        type="button"
        onClick={handleReveal}
        disabled={state.kind === "loading"}
        className="font-sans text-[10px] text-brand underline hover:opacity-80 mt-1 disabled:opacity-50"
      >
        {state.kind === "loading" ? "Loading…" : "Reveal"}
      </button>
    </div>
  );
}
