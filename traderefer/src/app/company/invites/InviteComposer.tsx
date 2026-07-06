"use client";

import { useActionState, useRef, useState } from "react";
import {
  addInvitesAction,
  sendInvitesAction,
  type AddInvitesState,
  type SendInvitesState,
} from "./actions";

const addInitial: AddInvitesState = {};
const sendInitial: SendInvitesState = {};

type Channel = "SMS" | "EMAIL";

type Sender = { id: string; label: string };

export function InviteComposer({
  smsAvailable,
  pendingSms,
  pendingEmail,
  remainingToday,
  dailyCap,
  defaults,
  placeholders,
  senders,
  currentUserId,
}: {
  smsAvailable: boolean;
  pendingSms: number;
  pendingEmail: number;
  remainingToday: number;
  dailyCap: number;
  defaults: { sms: string; emailSubject: string; emailBody: string };
  placeholders: Array<{ token: string; description: string }>;
  senders: Sender[];
  currentUserId: string;
}) {
  const [channel, setChannel] = useState<Channel>(
    smsAvailable ? "SMS" : "EMAIL",
  );
  const pendingForChannel = channel === "SMS" ? pendingSms : pendingEmail;

  return (
    <div className="space-y-6">
      {/* ── Channel picker ───────────────────────────────────────── */}
      <div className="flex gap-2">
        <ChannelTab
          active={channel === "SMS"}
          onClick={() => setChannel("SMS")}
          label="Text message"
          sub={smsAvailable ? `${pendingSms} waiting` : "not set up yet"}
          disabled={false}
        />
        <ChannelTab
          active={channel === "EMAIL"}
          onClick={() => setChannel("EMAIL")}
          label="Email"
          sub={`${pendingEmail} waiting`}
          disabled={false}
        />
      </div>

      {channel === "SMS" && !smsAvailable && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 text-sm">
          <strong>SMS isn&apos;t switched on yet.</strong> You can build
          your contact list now and it&apos;ll be ready to send the moment
          it is — or flip to email invites, which work today.
        </div>
      )}

      {/* ── Step 1: add contacts ─────────────────────────────────── */}
      <AddContactsForm channel={channel} />

      {/* ── Step 2: compose + send ───────────────────────────────── */}
      <ComposeForm
        channel={channel}
        smsAvailable={smsAvailable}
        pendingForChannel={pendingForChannel}
        remainingToday={remainingToday}
        dailyCap={dailyCap}
        defaults={defaults}
        placeholders={placeholders}
        senders={senders}
        currentUserId={currentUserId}
      />
    </div>
  );
}

function ChannelTab({
  active,
  onClick,
  label,
  sub,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 rounded-xl border px-4 py-3 text-left transition-colors ${
        active
          ? "border-brand bg-brand text-white"
          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
      }`}
    >
      <div className="font-semibold text-sm">{label}</div>
      <div
        className={`text-xs mt-0.5 ${active ? "text-slate-300" : "text-slate-500"}`}
      >
        {sub}
      </div>
    </button>
  );
}

function AddContactsForm({ channel }: { channel: Channel }) {
  const [state, action, pending] = useActionState(addInvitesAction, addInitial);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  return (
    <form
      action={action}
      className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
    >
      <input type="hidden" name="channel" value={channel} />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          1 · Add contacts
        </h2>
        <label className="text-xs text-brand underline cursor-pointer">
          …or upload a CSV
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (!file || !textRef.current) return;
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === "string" && textRef.current) {
                  const existing = textRef.current.value.trim();
                  textRef.current.value = existing
                    ? existing + "\n" + reader.result
                    : reader.result;
                }
              };
              reader.readAsText(file);
            }}
          />
        </label>
      </div>

      <textarea
        ref={textRef}
        name="contactLines"
        rows={5}
        placeholder={
          channel === "SMS"
            ? "One contact per line — name and mobile:\nDave Robson, 07700 900123\nSmith Roofing, 07700 900456"
            : "One contact per line — name and email:\nDave Robson, dave@smithroofing.co.uk\nKaren Lowe, karen@lowesparks.com"
        }
        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand"
      />
      <p className="text-xs text-slate-500">
        Name first, then {channel === "SMS" ? "mobile number" : "email"}
        {" — "}commas or tabs between them. We&apos;ll spot which is which, skip
        duplicates, and keep whatever extra columns your CSV has out of the
        way.
      </p>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add to list"}
        </button>
        {state.ok && (
          <span className="text-xs text-emerald-700">✓ {state.ok}</span>
        )}
        {state.error && (
          <span className="text-xs text-rose-700">{state.error}</span>
        )}
      </div>
      {state.problems && state.problems.length > 0 && (
        <ul className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-0.5">
          {state.problems.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}
    </form>
  );
}

function ComposeForm({
  channel,
  smsAvailable,
  pendingForChannel,
  remainingToday,
  dailyCap,
  defaults,
  placeholders,
  senders,
  currentUserId,
}: {
  channel: Channel;
  smsAvailable: boolean;
  pendingForChannel: number;
  remainingToday: number;
  dailyCap: number;
  defaults: { sms: string; emailSubject: string; emailBody: string };
  placeholders: Array<{ token: string; description: string }>;
  senders: Sender[];
  currentUserId: string;
}) {
  const [state, action, pending] = useActionState(
    sendInvitesAction,
    sendInitial,
  );
  const [message, setMessage] = useState<Record<Channel, string>>({
    SMS: defaults.sms,
    EMAIL: defaults.emailBody,
  });

  const canSend =
    pendingForChannel > 0 &&
    remainingToday > 0 &&
    (channel === "EMAIL" || smsAvailable);

  const batchSize = Math.min(pendingForChannel, remainingToday, 100);

  return (
    <form
      action={action}
      className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
    >
      <input type="hidden" name="channel" value={channel} />
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
        2 · Write your message
      </h2>

      {/* Who the invite appears to come from. Drives the From display
          name, Reply-To and the {{senderName}} placeholder. Only shown
          when there's actually a choice to make. */}
      {senders.length > 1 && (
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Send as</span>
          <select
            name="senderId"
            defaultValue={currentUserId}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {senders.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500 mt-1 block">
            Their name appears as the sender and replies go to their inbox.
          </span>
        </label>
      )}

      {channel === "EMAIL" && (
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Subject</span>
          <input
            name="subject"
            defaultValue={defaults.emailSubject}
            maxLength={150}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </label>
      )}

      <textarea
        name="message"
        rows={channel === "SMS" ? 5 : 12}
        value={message[channel]}
        onChange={(e) =>
          setMessage((m) => ({ ...m, [channel]: e.target.value }))
        }
        maxLength={1600}
        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
      />

      <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-slate-500">
        <span>
          Placeholders:{" "}
          {placeholders.map((p, i) => (
            <span key={p.token} title={p.description}>
              <code className="bg-slate-100 rounded px-1 py-0.5 cursor-help">
                {p.token}
              </code>
              {i < placeholders.length - 1 ? " " : ""}
            </span>
          ))}
        </span>
        {channel === "SMS" && (
          <span
            className={
              message.SMS.length > 480 ? "text-amber-600 font-medium" : ""
            }
          >
            ~{message.SMS.length} chars
            {message.SMS.length > 160 &&
              ` (${Math.ceil(message.SMS.length / 153)} SMS segments)`}
          </span>
        )}
      </div>

      <label className="flex items-start gap-3 cursor-pointer bg-amber-50 border border-amber-200 rounded-lg p-3">
        <input
          type="checkbox"
          name="contactsConfirmed"
          value="1"
          required
          className="mt-0.5 accent-emerald-700 h-4 w-4 flex-shrink-0"
        />
        <span className="text-xs text-amber-900">
          <strong>These are my own business contacts</strong> — people
          I&apos;ve worked with, supplied, or served — not a purchased or
          scraped list.
        </span>
      </label>

      <div className="flex items-center gap-3 flex-wrap pt-1">
        <button
          type="submit"
          disabled={pending || !canSend}
          className="btn-primary px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {pending
            ? "Sending…"
            : canSend
              ? `Send to ${batchSize} contact${batchSize === 1 ? "" : "s"} →`
              : "Nothing to send"}
        </button>
        <span className="text-xs text-slate-500">
          {remainingToday} of {dailyCap} daily invites remaining
        </span>
        {state.ok && (
          <span className="text-xs text-emerald-700">✓ {state.ok}</span>
        )}
        {state.error && (
          <span className="text-xs text-rose-700">{state.error}</span>
        )}
      </div>
    </form>
  );
}
