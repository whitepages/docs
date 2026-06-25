import { Glob } from "bun";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  assertCorpusInvariants,
  buildCatalog,
  isNavShell,
  parseDoc,
  renderRelated,
  resolveRelated,
  rewriteBody,
  serializeCatalog,
  withRelated,
} from "./corpus.core";
import type { ParsedDoc } from "./corpus.types";

const CONTENT_DIR = "content/docs";
const OUTPUT_DIR = process.argv[2] ?? process.env.MCP_CORPUS_OUT ?? "corpus";

async function readDoc(relativePath: string): Promise<ParsedDoc> {
  const raw = await readFile(join(CONTENT_DIR, relativePath), "utf8");
  return parseDoc(relativePath, raw);
}

function linkDocs(docs: readonly ParsedDoc[]): readonly ParsedDoc[] {
  const slugToId = new Map(docs.map((doc) => [doc.slug, doc.id]));
  const idToTitle = new Map(docs.map((doc) => [doc.id, doc.entry.title]));

  return docs.map((doc) => {
    const { body, edges: linkEdges } = rewriteBody(doc.body, slugToId, doc.id);
    const related = resolveRelated(doc.id, doc.related, slugToId);
    const section = renderRelated(
      related.map((id) => ({ id, title: idToTitle.get(id) ?? id })),
    );
    const edges = [...new Set([...linkEdges, ...related])].sort();

    return {
      ...doc,
      body: withRelated(body, section),
      entry: { ...doc.entry, edges },
    };
  });
}

async function main(): Promise<void> {
  const relativePaths = [...new Glob("**/*.mdx").scanSync(CONTENT_DIR)].sort();
  const parsed = await Promise.all(relativePaths.map(readDoc));
  const kept = parsed.filter((doc) => !isNavShell(doc.slug));

  const docs = linkDocs(kept);

  assertCorpusInvariants(docs.map((doc) => doc.id));

  const catalog = buildCatalog(docs.map((doc) => doc.entry));

  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const doc of [...docs].sort((a, b) => a.id.localeCompare(b.id))) {
    await writeFile(join(OUTPUT_DIR, `${doc.id}.md`), doc.body);
  }

  await writeFile(join(OUTPUT_DIR, "catalog.json"), serializeCatalog(catalog));

  console.log(
    `Wrote ${docs.length} docs + catalog.json to ${OUTPUT_DIR} ` +
      `(dropped ${parsed.length - kept.length} nav-shell pages)`,
  );
}

await main();
