import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { NavigationTitle } from "@/components/layout/navigation-title";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      transparentMode: "top",
      title: <NavigationTitle />,
      url: "/",
    },
    githubUrl: "https://github.com/whitepages/docs",
  };
}
