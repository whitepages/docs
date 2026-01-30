import defaultMdxComponents from "fumadocs-ui/mdx";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { APIPage } from "@/components/openapi/api-page";
import { ApiKeyTester } from "@/components/activation/api-key-tester";
import type { MDXComponents } from "mdx/types";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Steps,
    Step,
    APIPage,
    ApiKeyTester,
    ...components,
  };
}
