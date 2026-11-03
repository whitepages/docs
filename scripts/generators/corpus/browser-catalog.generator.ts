import { writeFile } from "node:fs/promises";
import { generateCorpus } from "./corpus.generator";

const catalog = await generateCorpus("corpus");
const documents = catalog.docs.map((document) => ({
  id: document.id,
  page_url: document.page_url,
}));
await writeFile(
  "public/assistant-catalog.json",
  `${JSON.stringify({ version: 1, documents })}\n`,
);
