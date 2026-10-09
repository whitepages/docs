import { Glob } from "bun";

// House style is sentence case: only the heading's first word, acronyms, and
// a short list of proper nouns stay capitalized. This flags headings that
// read as Title Case instead, so a page doesn't regress once it's fixed.
const PRESERVE_EXACT = new Set([
  "cURL",
  "Postman",
  "Whitepages",
  "JavaScript",
  "Python",
  "I",
]);

function isAcronymWord(word: string): boolean {
  return /^[A-Z]{2,}s?$/.test(word);
}

// A token with a digit is a version or identifier (V2, 429), not prose, so
// case doesn't apply to it.
function isVersionOrIdentifier(word: string): boolean {
  return /\d/.test(word);
}

// Sentence case lowercases everything after the first word, so any later
// word that isn't an acronym or an allow-listed proper noun and still
// starts with a capital letter is a violation on its own — no ratio needed.
function isTitleCaseHeading(heading: string): boolean {
  const withoutCode = heading.replace(/`[^`]+`/g, "");
  const words = withoutCode.match(/[A-Za-z][A-Za-z0-9'-]*/g) ?? [];

  return words.some((word, i) => {
    if (i === 0) return false;
    if (isAcronymWord(word)) return false;
    if (isVersionOrIdentifier(word)) return false;
    if (PRESERVE_EXACT.has(word)) return false;

    return /^[A-Z]/.test(word);
  });
}

const glob = new Glob("content/docs/**/*.mdx");
const violations: string[] = [];

for await (const file of glob.scan(".")) {
  const text = await Bun.file(file).text();
  const lines = text.split("\n");

  lines.forEach((line, i) => {
    const match = line.match(/^(#{2,3}) (.+)$/);
    if (!match) return;
    if (isTitleCaseHeading(match[2])) {
      violations.push(`${file}:${i + 1}  ${match[2]}`);
    }
  });
}

if (violations.length > 0) {
  console.error("Title Case headings found (house style is sentence case):\n");
  for (const violation of violations) console.error(`  ${violation}`);
  console.error(`\n${violations.length} violation(s)`);
  process.exit(1);
}
