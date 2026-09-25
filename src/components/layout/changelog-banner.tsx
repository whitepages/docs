"use client";

import { Banner } from "fumadocs-ui/components/banner";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ChangelogBanner() {
  const pathname = usePathname();

  if (pathname === "/changelog") {
    return null;
  }

  return (
    <Banner
      id="changelog-sep-2026"
      variant="normal"
      className="!bg-fd-primary !text-fd-primary-foreground"
    >
      <Link href="/changelog">
        New: match confidence on property search, strict matching, and more.{" "}
        <span className="font-semibold underline underline-offset-2">
          See what&apos;s changed &rarr;
        </span>
      </Link>
    </Banner>
  );
}
