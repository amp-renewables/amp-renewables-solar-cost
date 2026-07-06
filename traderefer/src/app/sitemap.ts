import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { platform } from "@/lib/platform";

// Regenerate daily so a newly-signed-up tenant's landing page appears in the
// sitemap without waiting for the next deploy.
export const revalidate = 86400;

// Static public routes + a live entry per active tenant landing page, so
// crawlers can discover /<slug> pages that aren't linked from the homepage.
// CANCELLED companies are excluded — their landing pages still resolve but
// shouldn't be promoted for indexing.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = platform.url;

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/help`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  let companyEntries: MetadataRoute.Sitemap = [];
  try {
    const companies = await prisma.company.findMany({
      where: { status: { not: "CANCELLED" } },
      select: { slug: true, updatedAt: true },
    });
    companyEntries = companies.map((c) => ({
      url: `${base}/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch (err) {
    // A DB hiccup must not 500 the sitemap — serve the static routes.
    console.error("[sitemap] company query failed:", err);
  }

  return [...staticEntries, ...companyEntries];
}
