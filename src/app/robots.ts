import type { MetadataRoute } from "next";
import { getConfig } from "@shared/config";

/**
 * ТЗ §47 — robots allows everything except the private /admin and /profile
 * areas, plus /cart and /checkout (SEO audit, 2026-09-21: crawl-budget
 * hygiene only — these are already `noindex` via page-level metadata,
 * which is what actually keeps them out of search results; robots.txt
 * Disallow here just saves crawlers the trip, per §9 "don't use robots.txt
 * as a substitute for noindex"). Auth pages (/login etc.) are deliberately
 * NOT disallowed here — they're noindex but still fine to crawl.
 */
export default function robots(): MetadataRoute.Robots {
  const appUrl = getConfig().appUrl;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/profile", "/cart", "/checkout"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
