import type { MetadataRoute } from "next";
import { getConfig } from "@shared/config";

/** ТЗ §47 — robots allows everything except the private /admin and /profile areas. */
export default function robots(): MetadataRoute.Robots {
  const appUrl = getConfig().appUrl;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/profile"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
