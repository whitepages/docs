import { createMDX } from "fumadocs-mdx/next";
import { DOCS_BASE_PATH } from "./src/lib/docs-prefix.mjs";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  basePath: DOCS_BASE_PATH,
  transpilePackages: [
    "shiki",
    "@shikijs/core",
    "@shikijs/rehype",
    "@shikijs/transformers",
  ],
  async rewrites() {
    return [
      {
        source: "/:path*.mdx",
        destination: "/llms.mdx/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/documentation/getting-started",
        permanent: false,
      },
      {
        source: "/documentation",
        destination: "/documentation/getting-started",
        statusCode: 301,
      },
    ];
  },
};

export default withMDX(config);
