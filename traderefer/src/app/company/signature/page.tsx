import { requireCompanyAdmin } from "@/lib/auth";
import { getCurrentCompany } from "@/lib/company";
import { SubNav, TEMPLATE_TABS } from "@/components/SubNav";
import {
  renderSignaturePlain,
  renderSignatureHtml,
  DEFAULT_SIGNATURE_TEMPLATE,
  SIGNATURE_PLACEHOLDERS,
} from "@/lib/signature";
import {
  SignatureEditor,
  CopyButton,
  RichCopyButton,
} from "./SignatureEditor";

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
      <SubNav items={TEMPLATE_TABS} active="/company/signature" />
      <div>
        <h1 className="text-2xl font-bold text-brand">Email signature</h1>
        <p className="text-sm text-slate-600 mt-1">
          A short line you paste into your email signature — turning every
          email you send into a quiet recruitment ad for your referral
          programme. The payout figure updates automatically whenever you
          change your settings.
        </p>
      </div>

      {/* ─────────── PRIMARY: PREVIEW + ONE-CLICK COPY ─────────── */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-3">
          Your signature
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <p className="text-xs text-slate-400 mb-3">
              ↓ Exactly how this will appear at the bottom of your emails
            </p>
            {/* The rendered, selectable preview. Users can also drag-select
                this block and Cmd/Ctrl+C — the browser preserves formatting
                via the OS clipboard, same result as the button. */}
            <div
              className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700 select-text"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-100">
            <RichCopyButton
              label="Copy signature →"
              html={html}
              plain={plain}
            />
            <p className="text-xs text-slate-500 flex-1 min-w-[260px]">
              Paste straight into Gmail, Outlook (web), Apple Mail or any
              modern email client — the formatting and link carry over
              automatically. No HTML editing required.
            </p>
          </div>
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

      {/* ─────────── ADVANCED / FALLBACKS ─────────── */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-3">
          Other formats
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          <details className="group p-5 cursor-pointer">
            <summary className="flex items-center justify-between gap-3 list-none">
              <span className="font-medium text-slate-800 group-hover:text-brand">
                Plain text (for iOS Mail and basic text fields)
              </span>
              <span className="text-slate-400 text-xl flex-shrink-0 group-open:rotate-45 transition-transform">
                +
              </span>
            </summary>
            <div className="mt-4 space-y-3">
              <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs whitespace-pre-wrap">
                {plain}
              </pre>
              <div className="flex items-center gap-3 flex-wrap">
                <CopyButton
                  label="Copy plain text"
                  content={plain}
                  variant="secondary"
                />
                <p className="text-xs text-slate-500">
                  iOS Mail strips HTML from signatures, so use this version
                  on iPhone / iPad. Works as a fallback anywhere.
                </p>
              </div>
            </div>
          </details>

          <details className="group p-5 cursor-pointer">
            <summary className="flex items-center justify-between gap-3 list-none">
              <span className="font-medium text-slate-800 group-hover:text-brand">
                Raw HTML source (for advanced setups)
              </span>
              <span className="text-slate-400 text-xl flex-shrink-0 group-open:rotate-45 transition-transform">
                +
              </span>
            </summary>
            <div className="mt-4 space-y-3">
              <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all">
                {html}
              </pre>
              <div className="flex items-center gap-3 flex-wrap">
                <CopyButton
                  label="Copy raw HTML"
                  content={html}
                  variant="secondary"
                />
                <p className="text-xs text-slate-500">
                  Only needed if your email client lets you edit signature
                  HTML directly (e.g. some Outlook desktop setups). Most
                  people should ignore this and use the &quot;Copy
                  signature&quot; button above.
                </p>
              </div>
            </div>
          </details>
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
              'Click "Copy signature →" above',
              "In Gmail: click the gear icon (top right) → See all settings",
              "Stay on the General tab and scroll to the Signature section",
              'Click "+ Create new" if you don\'t have one yet, then name it',
              "Click inside the signature editor box and paste (Cmd+V / Ctrl+V) — the formatted signature appears with the link clickable",
              "Set it as default for new mails / replies in the dropdowns underneath",
              'Scroll to the bottom and click "Save Changes"',
            ]}
          />
          <ClientGuide
            client="Outlook (web / Microsoft 365)"
            steps={[
              'Click "Copy signature →" above',
              "In Outlook: Settings (gear icon) → View all Outlook settings",
              "Mail → Compose and reply → Email signature",
              'Click "+ New signature", give it a name',
              "Click into the editor and paste — Outlook keeps the formatting and link",
              "Tick 'Automatically include my signature on new messages' and 'on messages I forward or reply to'",
              'Click "Save"',
            ]}
          />
          <ClientGuide
            client="Apple Mail (macOS)"
            steps={[
              'Click "Copy signature →" above',
              "In Mail: Settings (or Preferences on older versions) → Signatures",
              'Click the "+" to add a new signature',
              "Click inside the right-hand editor and paste — formatting and link are preserved",
              "Drag the new signature to the account on the left where you want it active",
              'Pick it from the "Choose Signature" dropdown at the bottom',
            ]}
          />
          <ClientGuide
            client="iOS Mail (iPhone / iPad)"
            steps={[
              "Open the 'Plain text' section under 'Other formats' below and tap 'Copy plain text'",
              "On your phone: Settings app → Mail → Signature",
              'Pick "Per Account" if you only want this on your business email',
              "Tap the signature field and paste — iOS Mail signatures don't render HTML, so the plain text is the right choice here",
              "Tap Back — change saves automatically",
            ]}
          />
          <ClientGuide
            client="Outlook (Windows desktop)"
            steps={[
              'Click "Copy signature →" above',
              "In Outlook: File → Options → Mail → Signatures…",
              'Click "New" to create a signature, give it a name',
              "Click into the editor area and paste — formatting carries over",
              "Set it as the default for new messages and replies/forwards in the dropdowns top-right",
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
