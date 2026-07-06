import type { MetadataRoute } from "next";
import { platform } from "@/lib/platform";

// Crawl directives. Public marketing + tenant landing pages are crawlable;
// the authenticated app, auth pages and API are kept out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/company",
        "/platform",
        "/login",
        "/forgot-password",
        "/reset-password",
        "/api",
      ],
    },
    sitemap: `${platform.url}/sitemap.xml`,
    host: platform.url,
  };
}
