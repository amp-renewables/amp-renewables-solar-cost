"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth";
import { assertCompanyCanWriteById } from "@/lib/stripe";

const UpsertSchema = z.object({
  id: z.string().optional(),
  channel: z.enum(["SMS", "EMAIL"]),
  title: z.string().trim().min(2),
  subject: z.string().optional(),
  body: z.string().trim().min(5),
  sortOrder: z.coerce.number().int().default(0),
  active: z.coerce.boolean().optional(),
});

export async function upsertTemplateAction(formData: FormData) {
  const admin = await requireCompanyAdmin();
  await assertCompanyCanWriteById(admin.companyId);
  const result = UpsertSchema.safeParse({
    id: formData.get("id") || undefined,
    channel: formData.get("channel"),
    title: formData.get("title"),
    subject: formData.get("subject") || undefined,
    body: formData.get("body"),
    sortOrder: formData.get("sortOrder") || 0,
    active: formData.get("active") === "on",
  });
  if (!result.success) {
    console.error(
      "[upsertTemplateAction] invalid form submission:",
      result.error.flatten(),
    );
    throw new Error(
      "Could not save template — check the title and body fields.",
    );
  }
  const parsed = result.data;

  if (parsed.id) {
    // Only allow updating templates in this admin's company.
    const existing = await prisma.messageTemplate.findUnique({
      where: { id: parsed.id },
      select: { companyId: true },
    });
    if (!existing || existing.companyId !== admin.companyId) {
      throw new Error("Not authorised to modify this template");
    }
    await prisma.messageTemplate.update({
      where: { id: parsed.id },
      data: {
        channel: parsed.channel,
        title: parsed.title,
        subject: parsed.subject ?? null,
        body: parsed.body,
        sortOrder: parsed.sortOrder,
        active: parsed.active ?? true,
      },
    });
  } else {
    await prisma.messageTemplate.create({
      data: {
        companyId: admin.companyId,
        channel: parsed.channel,
        title: parsed.title,
        subject: parsed.subject ?? null,
        body: parsed.body,
        sortOrder: parsed.sortOrder,
        active: parsed.active ?? true,
      },
    });
  }

  revalidatePath("/company/templates");
  revalidatePath("/dashboard/templates");
}

export async function deleteTemplateAction(formData: FormData) {
  const admin = await requireCompanyAdmin();
  await assertCompanyCanWriteById(admin.companyId);
  const id = String(formData.get("id") || "");
  if (!id) return;
  const existing = await prisma.messageTemplate.findUnique({
    where: { id },
    select: { companyId: true },
  });
  if (!existing || existing.companyId !== admin.companyId) return;
  await prisma.messageTemplate.delete({ where: { id } });
  revalidatePath("/company/templates");
  revalidatePath("/dashboard/templates");
}
