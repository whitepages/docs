import { Glob } from "bun";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  assertCorpusInvariants,
  buildCatalog,
  parseDoc,
  renderRelated,
  resolveRelated,
  rewriteBody,
  selectCorpusDocs,
  serializeCatalog,
  slugIndex,
  withRelated,
} from "./corpus.core";
import type { Catalog, ParsedDoc } from "./corpus.types";

const CONTENT_DIRECTORY = "content/docs";

async function readDoc(relativePath: string): Promise<ParsedDoc> {
  const raw = await readFile(join(CONTENT_DIRECTORY, relativePath), "utf8");
  return parseDoc(relativePath, raw);
}

function linkDocs(docs: readonly ParsedDoc[]): readonly ParsedDoc[] {
  const slugToId = slugIndex(docs);
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

export async function generateCorpus(
  outputDirectory: string,
): Promise<Catalog> {
  const relativePaths = [
    ...new Glob("**/*.mdx").scanSync(CONTENT_DIRECTORY),
  ].sort();
  const parsed = await Promise.all(relativePaths.map(readDoc));
  const docs = linkDocs(selectCorpusDocs(parsed));
  assertCorpusInvariants(docs.map((doc) => doc.id));
  const catalog = buildCatalog(docs.map((doc) => doc.entry));
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  for (const doc of [...docs].sort((a, b) => a.id.localeCompare(b.id))) {
    await writeFile(join(outputDirectory, `${doc.id}.md`), doc.body);
  }
  await writeFile(
    join(outputDirectory, "catalog.json"),
    serializeCatalog(catalog),
  );
  process.stdout.write(
    `Wrote ${docs.length} docs + catalog.json to ${outputDirectory} (dropped ${parsed.length - docs.length} nav-shell pages)\n`,
  );
  return catalog;
}

if (import.meta.main) {
  await generateCorpus(
    process.argv[2] ?? process.env.MCP_CORPUS_OUT ?? "corpus",
  );
}
