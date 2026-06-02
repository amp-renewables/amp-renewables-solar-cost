import { requireCompanyAdmin } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/company";
import {
  renderSignaturePlain,
  renderSignatureHtml,
  DEFAULT_SIGNATURE_TEMPLATE,
  SIGNATURE_PLACEHOLDERS,
} from "@/lib/signature";
import { SignatureEditor, CopyButton } from "./SignatureEditor";

export default async function SignaturePage() {
  await requireCompanyAdmin();
  const company = await getCurrentCompany();
  if (!company) return null;

  const plain = renderSignaturePlain(company);
  const html = renderSignatureHtml(company);
  const currentTemplate =
    company.emailSignature || DEFAULT_SIGNATURE_TEMPLATE;

  return (
    <div className="space-y-10 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-brand">Email signature</h1>
        <p className="text-sm text-slate-600 mt-1">
          A short line you paste into your email signature — turning every
          email you send into a quiet recruitment ad for your referral
          programme. The payout figure updates automatically whenever you
          change your settings.
        </p>
      </div>

      {/* ─────────── PREVIEW ─────────── */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-3">
          Preview
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="text-xs text-slate-400 mb-2">
            ↓ How this appears at the bottom of your emails
          </div>
          <div
            className="text-sm text-slate-700"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </section>

      {/* ─────────── EDIT ─────────── */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-3">
          Customise the text
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <SignatureEditor
            currentTemplate={currentTemplate}
            defaultTemplate={DEFAULT_SIGNATURE_TEMPLATE}
            placeholders={SIGNATURE_PLACEHOLDERS}
          />
        </div>
      </section>

      {/* ─────────── COPY ─────────── */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-3">
          Copy &amp; install
        </h2>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
              <h3 className="text-sm font-semibold text-slate-800">
                For Gmail, Outlook (web), Apple Mail
              </h3>
              <CopyButton label="Copy HTML" content={html} />
            </div>
            <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all">
              {html}
            </pre>
            <p className="text-xs text-slate-500 mt-2">
              Renders with a divider line, the payout figure in bold, and a
              clickable link. Best result in any client that supports HTML
              signatures (most of them).
            </p>
          </div>

          <div className="border-t border-slate-200 pt-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
              <h3 className="text-sm font-semibold text-slate-800">
                For iOS Mail and any plain-text setup
              </h3>
              <CopyButton
                label="Copy plain text"
                content={plain}
                variant="secondary"
              />
            </div>
            <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs whitespace-pre-wrap">
              {plain}
            </pre>
            <p className="text-xs text-slate-500 mt-2">
              iOS Mail strips most HTML from signatures — use this version
              there. Works in every other client too as a fallback.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────── INSTALL GUIDES ─────────── */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-3">
          Install in your email client
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          <ClientGuide
            client="Gmail (web)"
            steps={[
              "Click the gear icon (top right) → See all settings",
              "Stay on the General tab and scroll to the Signature section",
              'Click "+ Create new" if you don\'t have one yet, or pick an existing one to add this to',
              "Paste the HTML signature (or plain text if you prefer simple)",
              'Scroll to the bottom and click "Save Changes"',
            ]}
          />
          <ClientGuide
            client="Outlook (web)"
            steps={[
              "Settings (gear icon) → View all Outlook settings",
              "Mail → Compose and reply → Email signature",
              "Paste the HTML version into the editor",
              "Tick the boxes for 'Automatically include my signature on new messages' and 'on messages I forward or reply to'",
              'Click "Save"',
            ]}
          />
          <ClientGuide
            client="Apple Mail (macOS)"
            steps={[
              "Mail → Settings (or Preferences on older versions) → Signatures",
              'Click the "+" to add a new signature',
              "Paste the plain text version (Apple Mail's editor doesn't accept pasted HTML cleanly)",
              "Drag the new signature to the account on the left where you want it active",
              'Pick it from the "Choose Signature" dropdown',
            ]}
          />
          <ClientGuide
            client="iOS Mail (iPhone / iPad)"
            steps={[
              "Settings app → Mail → Signature",
              'Pick "Per Account" if you only want this on your business email',
              "Paste the plain-text version (iOS strips HTML)",
              "Press Back — change saves automatically",
            ]}
          />
          <ClientGuide
            client="Outlook (Windows desktop)"
            steps={[
              "File → Options → Mail → Signatures…",
              'Click "New" to create a signature',
              "Paste the HTML version into the editor",
              "Set it as the default for new messages and replies/forwards",
              'Click "OK" through all dialogs',
            ]}
          />
        </div>
      </section>

      <p className="text-xs text-slate-500">
        Tip: this won&apos;t back-apply to emails you&apos;ve already sent
        — but every new email you send from now on will quietly prompt
        whoever you&apos;re emailing to become a referrer.
      </p>
    </div>
  );
}

function ClientGuide({
  client,
  steps,
}: {
  client: string;
  steps: string[];
}) {
  return (
    <details className="group p-5 cursor-pointer">
      <summary className="flex items-center justify-between gap-3 list-none">
        <span className="font-medium text-slate-800 group-hover:text-brand">
          {client}
        </span>
        <span className="text-slate-400 text-xl flex-shrink-0 group-open:rotate-45 transition-transform">
          +
        </span>
      </summary>
      <ol className="mt-3 space-y-2 text-sm text-slate-600 list-decimal list-inside pl-2">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </details>
  );
}
