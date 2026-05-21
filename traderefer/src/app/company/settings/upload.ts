"use server";

import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { requireCompanyAdmin } from "@/lib/auth";
import { assertCompanyCanWriteById } from "@/lib/stripe";

// Best-effort delete of a previous logo blob. Only attempts deletion for URLs
// that look like our own blob store (so we don't try to call del() on a
// hand-pasted external URL or a logo from a different store). Errors are
// logged but never thrown — orphaning a blob is better than failing the
// upload from the user's perspective.
async function tryDeletePreviousBlob(url: string | null | undefined) {
  if (!url) return;
  if (!url.includes(".public.blob.vercel-storage.com/")) return;
  try {
    await del(url);
  } catch (err) {
    console.error("[blob] failed to delete previous logo:", err);
  }
}

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
]);

// 4 MB hard cap. Vercel's server-action body cap is 4.5 MB, so keep below.
const MAX_BYTES = 4 * 1024 * 1024;

export type UploadState = {
  ok?: string;
  error?: string;
};

export async function uploadCompanyLogoAction(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const admin = await requireCompanyAdmin();
  await assertCompanyCanWriteById(admin.companyId);

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      error:
        "File uploads aren't configured for this deployment. Ask the platform owner to enable Vercel Blob.",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pick a file to upload." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return {
      error: "Logo must be a PNG, JPEG, WEBP or SVG.",
    };
  }
  if (file.size > MAX_BYTES) {
    return {
      error: `File is ${(file.size / 1024 / 1024).toFixed(1)} MB — max is 4 MB.`,
    };
  }

  // Look up the existing logoUrl + slug so we can (a) revalidate the right
  // public landing page and (b) delete the previous blob after a successful
  // replacement.
  const existing = await prisma.company.findUnique({
    where: { id: admin.companyId },
    select: { slug: true, logoUrl: true },
  });
  if (!existing) {
    return { error: "Company not found." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const key = `companies/${admin.companyId}/logo-${Date.now()}.${ext}`;

  let url: string;
  try {
    const blob = await put(key, file, {
      access: "public",
      addRandomSuffix: false,
    });
    url = blob.url;
  } catch (err) {
    console.error("[blob] upload failed:", err);
    return { error: "Upload failed. Try again or paste a logo URL instead." };
  }

  await prisma.company.update({
    where: { id: admin.companyId },
    data: { logoUrl: url },
  });

  // Fire-and-forget: clean up the old blob now that the new one is wired in.
  // Awaited so we don't return before the cleanup completes on a cold start,
  // but a failure here doesn't undo the successful upload.
  await tryDeletePreviousBlob(existing.logoUrl);

  revalidatePath("/company/settings");
  revalidatePath("/company");
  revalidatePath(`/${existing.slug}`);
  return { ok: "Logo uploaded." };
}

// Fire-and-forget variant used as a `formAction` on a separate submit button.
// Returns void so it matches the form action signature; the page revalidate
// shows the result.
export async function clearCompanyLogoAction(): Promise<void> {
  const admin = await requireCompanyAdmin();
  await assertCompanyCanWriteById(admin.companyId);

  const existing = await prisma.company.findUnique({
    where: { id: admin.companyId },
    select: { slug: true, logoUrl: true },
  });

  await prisma.company.update({
    where: { id: admin.companyId },
    data: { logoUrl: null },
  });

  await tryDeletePreviousBlob(existing?.logoUrl);

  revalidatePath("/company/settings");
  revalidatePath("/company");
  if (existing?.slug) {
    revalidatePath(`/${existing.slug}`);
  }
}
