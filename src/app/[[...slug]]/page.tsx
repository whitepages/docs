import { getPageImage, source } from "@/lib/source";
import { absoluteDocsUrl } from "@/lib/site-url";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "@/components/layout/notebook/page";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/mdx-components";
import type { Metadata } from "next";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { RelatedLinks, type RelatedLink } from "@/components/related-links";
import { getBreadcrumbItems } from "fumadocs-core/breadcrumb";
import { buildStructuredData, toScriptSafeJson } from "@/lib/structured-data";

function resolveRelatedLinks(urls: readonly string[]): RelatedLink[] {
  return urls.flatMap((url) => {
    const target = source.getPage(url.split("/").filter(Boolean));
    if (!target) return [];
    return [
      {
        url: target.url,
        title: target.data.title,
        description: target.data.description,
      },
    ];
  });
}

export default async function Page(props: PageProps<"/[[...slug]]">) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const relatedLinks = resolveRelatedLinks(page.data.related);

  // Matches the items PageBreadcrumb renders with its own defaults, so the
  // schema never asserts a trail the reader doesn't see. A non-string name
  // is dropped rather than mislabeled with this page's own title.
  const breadcrumb = getBreadcrumbItems(page.url, source.pageTree).flatMap(
    (item) => {
      if (typeof item.name !== "string") return [];
      return [
        {
          name: item.name,
          url: item.url ? absoluteDocsUrl(item.url) : undefined,
        },
      ];
    },
  );

  const structuredData = buildStructuredData(
    {
      url: absoluteDocsUrl(page.url),
      title: page.data.title,
      description: page.data.description,
    },
    breadcrumb,
  );

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toScriptSafeJson(structuredData) }}
      />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
        <RelatedLinks links={relatedLinks} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(
  props: PageProps<"/[[...slug]]">,
): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const url = absoluteDocsUrl(page.url);

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: page.data.title,
      description: page.data.description,
      url,
      type: "website",
      siteName: "Whitepages Pro API",
      images: getPageImage(page).url,
    },
  };
}
