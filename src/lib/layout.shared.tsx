import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { WhitepagesLogoLink } from "@/components/layout/whitepages-logo-link";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      transparentMode: "top",
      title: <WhitepagesLogoLink />,
      url: "https://www.whitepages.com",
    },
    githubUrl: "https://github.com/whitepages/docs",
  };
}
