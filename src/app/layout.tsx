import { RootProvider } from "fumadocs-ui/provider/next";
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
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
