/**
 * Absolute URLs for machine-readable outputs.
 *
 * Crawlers fetch sitemap.xml, llms.txt, and llms-full.txt as standalone
 * documents, so a root-relative target in one of them resolves against the
 * host root rather than the `/docs` base path the site is served under.
 * Content files keep writing root-relative links because Next prepends
 * `basePath` itself for in-app navigation; the rewrite belongs here, at the
 * point the text leaves the app, not in the MDX.
 *
 * The index page is emitted as the bare base path. Serving normalizes
 * `/docs/` to `/docs` with a 308 before the 307 on to the getting-started
 * page, so keeping the trailing slash would publish a two-hop redirect chain.
 *
 * `absolutizeRootRelativeLinks` is intentionally narrow. It rewrites a target
 * only where a single leading `/` follows a markdown `](` or an HTML `href="`,
 * which leaves absolute URLs, protocol-relative `//host` targets, `mailto:`,
 * and bare `#anchor` fragments untouched.
 */

export const SITE_BASE_URL = "https://api.whitepages.com/docs";

export function absoluteDocsUrl(path: string): string {
  return path === "/" ? SITE_BASE_URL : `${SITE_BASE_URL}${path}`;
}

export function absolutizeRootRelativeLinks(text: string): string {
  const markdownTarget = /\]\(\/(?!\/)/g;
  const htmlHref = /href="\/(?!\/)/g;

  return text
    .replace(markdownTarget, () => `](${SITE_BASE_URL}/`)
    .replace(htmlHref, () => `href="${SITE_BASE_URL}/`);
}
