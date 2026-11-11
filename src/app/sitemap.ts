import type { MetadataRoute } from "next";
import { site } from "@/lib/config";
import { TOOLS } from "@/lib/tools-catalog";
import { GUIDES } from "@/content/guides";

/** Only real, useful, indexable pages. No auto-generated city/doorway pages. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: Array<[string, number, MetadataRoute.Sitemap[number]["changeFrequency"]]> = [
    ["/", 1, "weekly"],
    ["/hi", 0.9, "weekly"],
    ["/creators", 0.9, "monthly"],
    ["/brands", 0.9, "monthly"],
    ["/why-switch", 0.9, "monthly"],
    ["/pricing", 0.8, "monthly"],
    ["/join", 0.8, "monthly"],
    ["/about", 0.6, "monthly"],
    ["/contact", 0.5, "yearly"],
    ["/privacy", 0.3, "yearly"],
    ["/terms", 0.3, "yearly"],
    ["/community-guidelines", 0.3, "yearly"],
    ["/refund-policy", 0.2, "yearly"],
    ["/grievance", 0.2, "yearly"],
  ];
  const base = pages.map(([path, priority, changeFrequency]) => ({ url: `${site.url}${path}`, lastModified: now, changeFrequency, priority }));
  return [
    ...base,
    { url: `${site.url}/tools`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...TOOLS.map((t) => ({ url: `${site.url}/tools/${t.slug}`, lastModified: new Date(t.updated), changeFrequency: "monthly" as const, priority: 0.85 })),
    { url: `${site.url}/guides`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...GUIDES.map((g) => ({ url: `${site.url}/guides/${g.slug}`, lastModified: new Date(g.updated), changeFrequency: "monthly" as const, priority: 0.75 })),
  ];
}
