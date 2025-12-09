import { RootProvider } from "fumadocs-ui/provider/next";
import "./global.css";
import { Roboto } from "next/font/google";

const inter = Roboto({
  subsets: ["latin"],
});

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
