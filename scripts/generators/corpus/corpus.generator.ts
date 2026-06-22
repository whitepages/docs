import { Glob } from "bun";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  assertCorpusInvariants,
  buildCatalog,
  parseDoc,
  serializeCatalog,
} from "./corpus.core";
import type { ParsedDoc } from "./corpus.types";

const CONTENT_DIR = "content/docs";
const OUTPUT_DIR = process.argv[2] ?? process.env.MCP_CORPUS_OUT ?? "corpus";

async function readDoc(relativePath: string): Promise<ParsedDoc> {
  const raw = await readFile(join(CONTENT_DIR, relativePath), "utf8");
  return parseDoc(relativePath, raw);
}

async function main(): Promise<void> {
  const relativePaths = [...new Glob("**/*.mdx").scanSync(CONTENT_DIR)].sort();
  const docs = await Promise.all(relativePaths.map(readDoc));

  assertCorpusInvariants(docs.map((doc) => doc.id));

  const catalog = buildCatalog(docs.map((doc) => doc.entry));

  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const doc of [...docs].sort((a, b) => a.id.localeCompare(b.id))) {
    await writeFile(join(OUTPUT_DIR, `${doc.id}.md`), doc.body);
  }

  await writeFile(join(OUTPUT_DIR, "catalog.json"), serializeCatalog(catalog));

  console.log(`Wrote ${docs.length} docs + catalog.json to ${OUTPUT_DIR}`);
}

await main();
