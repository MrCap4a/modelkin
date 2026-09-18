import type { MetadataRoute } from "next";
import { getConfig } from "@shared/config";
import { listPublishedModelSlugs } from "@modules/models";

// Must be rendered per-request, not prerendered at build time: the model
// list changes independently of deploys (admin publish/hide), and the
// Docker build stage has no real database to query anyway (it runs with
// placeholder env vars — see Dockerfile). Without this, `next build`
// fails outright when there's no reachable DB at build time.
export const dynamic = "force-dynamic";

/** ТЗ §47 — every PUBLISHED model URL plus the static public pages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = getConfig().appUrl;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${appUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${appUrl}/models`, changeFrequency: "daily", priority: 0.9 },
    { url: `${appUrl}/custom-order`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${appUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${appUrl}/license`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const models = await listPublishedModelSlugs();
  const modelRoutes: MetadataRoute.Sitemap = models.map((model) => ({
    url: `${appUrl}/models/${model.slug}`,
    lastModified: model.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...modelRoutes];
}
