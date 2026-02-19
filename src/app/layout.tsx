import { RootProvider } from "fumadocs-ui/provider/next";
import { Banner } from "fumadocs-ui/components/banner";
import "./global.css";
import { Roboto } from "next/font/google";
import type { Metadata } from "next";
import { Amplitude } from "@/lib/amplitude";

const roboto = Roboto({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Whitepages API Documentation",
    template: "%s | Whitepages API",
  },
  description:
    "Official documentation for the Whitepages API. Access comprehensive person and property data for identity verification, customer enrichment, and research.",
  keywords: [
    "Whitepages",
    "API",
    "documentation",
    "person search",
    "property search",
    "identity verification",
    "data enrichment",
  ],
  authors: [{ name: "Whitepages" }],
  creator: "Whitepages",
  publisher: "Whitepages",
  metadataBase: new URL("https://api.whitepages.com/docs"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Whitepages API Documentation",
    title: "Whitepages API Documentation",
    description:
      "Official documentation for the Whitepages API. Access comprehensive person and property data for identity verification, customer enrichment, and research.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Whitepages API Documentation",
    description:
      "Official documentation for the Whitepages API. Access comprehensive person and property data.",
  },
  icons: {
    icon: "/docs/favicon.ico",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={roboto.className} suppressHydrationWarning>
      <Amplitude />
      <body className="flex flex-col min-h-screen">
        <Banner
          id="webhooks-announcement"
          variant="normal"
          className="!bg-fd-primary !text-fd-primary-foreground"
        >
          <a
            href="https://www.whitepages.com/blog/whitepages-live-property-deed-feed"
            target="_blank"
            rel="noopener noreferrer"
          >
            Introducing Webhooks — Get real-time property deed updates delivered
            to you.{" "}
            <span className="font-semibold underline underline-offset-2">
              Learn more &rarr;
            </span>
          </a>
        </Banner>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
