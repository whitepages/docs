import type { MetadataRoute } from "next";
import { source } from "@/lib/source";
import { absoluteDocsUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return source.getPages().map((page) => ({
    url: absoluteDocsUrl(page.url),
  }));
}
