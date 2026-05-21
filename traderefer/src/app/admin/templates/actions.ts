"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

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
  await requireAdmin();
  const parsed = UpsertSchema.parse({
    id: formData.get("id") || undefined,
    channel: formData.get("channel"),
    title: formData.get("title"),
    subject: formData.get("subject") || undefined,
    body: formData.get("body"),
    sortOrder: formData.get("sortOrder") || 0,
    active: formData.get("active") === "on",
  });

  if (parsed.id) {
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
        channel: parsed.channel,
        title: parsed.title,
        subject: parsed.subject ?? null,
        body: parsed.body,
        sortOrder: parsed.sortOrder,
        active: parsed.active ?? true,
      },
    });
  }

  revalidatePath("/admin/templates");
  revalidatePath("/dashboard/templates");
}

export async function deleteTemplateAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.messageTemplate.delete({ where: { id } });
  revalidatePath("/admin/templates");
  revalidatePath("/dashboard/templates");
}
