import { describe, expect, test } from "bun:test";
import { SITE_BASE_URL } from "@/lib/site-url";
import { GET } from "./route";

async function llmsTxt(): Promise<string> {
  return await (await GET()).text();
}

function linkTargets(body: string): string[] {
  return [...body.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]);
}

describe("llms.txt", () => {
  test("lists every documentation page", async () => {
    expect(linkTargets(await llmsTxt()).length).toBeGreaterThan(50);
  });

  test("gives every link an absolute target under the docs base path", async () => {
    const targets = linkTargets(await llmsTxt());

    expect(targets).not.toBeEmpty();
    for (const target of targets) {
      const underBasePath =
        target === SITE_BASE_URL || target.startsWith(`${SITE_BASE_URL}/`);

      expect(underBasePath).toBe(true);
    }
  });

  test("points at llms-full.txt absolutely", async () => {
    expect(await llmsTxt()).toContain(
      `(${SITE_BASE_URL}/llms-full.txt): Complete documentation content`,
    );
  });
});
