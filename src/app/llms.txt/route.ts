import { source } from "@/lib/source";

export const revalidate = false;

export async function GET() {
  const pages = source.getPages();

  const lines = pages.map((page) => {
    const url = page.url;
    const title = page.data.title;
    const description = page.data.description || "";

    return `- [${title}](${url})${description ? `: ${description}` : ""}`;
  });

  const content = `# Whitepages Pro API Documentation

> Documentation for the Whitepages Pro API

${lines.join("\n")}

## Full Documentation

- [/llms-full.txt](/llms-full.txt): Complete documentation content
`;

  return new Response(content);
}
