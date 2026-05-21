import { prisma } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth";
import { upsertTemplateAction, deleteTemplateAction } from "./actions";

export default async function CompanyTemplatesPage() {
  const admin = await requireCompanyAdmin();
  const templates = await prisma.messageTemplate.findMany({
    where: { companyId: admin.companyId },
    orderBy: [{ channel: "asc" }, { sortOrder: "asc" }],
  });

  return (
    <div className="space-y-8">
      <h1
        className="text-2xl font-bold text-brand"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        Message templates
      </h1>
      <p className="text-sm text-slate-600 -mt-4">
        These are the SMS and email templates partners can copy from their
        dashboard. Use placeholders <code>{"{{partnerName}}"}</code>,{" "}
        <code>{"{{businessName}}"}</code>,{" "}
        <code>{"{{companyName}}"}</code>,{" "}
        <code>{"{{supportPhone}}"}</code>,{" "}
        <code>{"{{supportEmail}}"}</code>,{" "}
        <code>{"{{domain}}"}</code> — they&apos;ll be substituted automatically.
      </p>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-3">
          New template
        </h2>
        <TemplateForm />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold">
          Existing templates ({templates.length})
        </h2>
        {templates.map((t) => (
          <TemplateForm key={t.id} template={t} />
        ))}
      </section>
    </div>
  );
}

function TemplateForm({
  template,
}: {
  template?: {
    id: string;
    channel: "SMS" | "EMAIL";
    title: string;
    subject: string | null;
    body: string;
    sortOrder: number;
    active: boolean;
  };
}) {
  return (
    <form
      action={upsertTemplateAction}
      className="bg-white border border-slate-200 rounded-xl p-4 space-y-3"
    >
      {template && <input type="hidden" name="id" value={template.id} />}
      <div className="grid sm:grid-cols-4 gap-3">
        <label className="block sm:col-span-1">
          <span className="text-xs uppercase tracking-wider text-slate-500">
            Channel
          </span>
          <select
            name="channel"
            defaultValue={template?.channel ?? "SMS"}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="SMS">SMS</option>
            <option value="EMAIL">Email</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs uppercase tracking-wider text-slate-500">
            Title (internal)
          </span>
          <input
            type="text"
            name="title"
            defaultValue={template?.title ?? ""}
            required
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="text-xs uppercase tracking-wider text-slate-500">
            Sort
          </span>
          <input
            type="number"
            name="sortOrder"
            defaultValue={template?.sortOrder ?? 0}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-xs uppercase tracking-wider text-slate-500">
          Subject (email only)
        </span>
        <input
          type="text"
          name="subject"
          defaultValue={template?.subject ?? ""}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-wider text-slate-500">
          Body
        </span>
        <textarea
          name="body"
          rows={6}
          defaultValue={template?.body ?? ""}
          required
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
        />
      </label>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={template ? template.active : true}
          />
          Active (visible to partners)
        </label>
        <div className="flex gap-2">
          {template && (
            <button
              type="submit"
              formAction={deleteTemplateAction}
              className="text-sm text-rose-700 underline"
            >
              Delete
            </button>
          )}
          <button
            type="submit"
            className="btn-primary text-sm px-4 py-2 rounded-lg font-medium"
          >
            {template ? "Save changes" : "Create template"}
          </button>
        </div>
      </div>
    </form>
  );
}
