import type { MetadataRoute } from "next";
import { DATA } from "@/content/site";
import { SITE_URL, projectPath } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...DATA.projects.map((p) => ({ url: `${SITE_URL}${projectPath(p)}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
