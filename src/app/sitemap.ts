import type { MetadataRoute } from "next";
import { source } from "@/lib/source";

const baseUrl = "https://api.whitepages.com/docs";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl,
      changeFrequency: "monthly",
      priority: 1,
    },
    ...source.getPages().map((page) => ({
      url: `${baseUrl}${page.url}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
