import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../src", import.meta.url));
const allowedExt = new Set([".css", ".scss"]);

function listFiles(dir) {
  const entries = readdirSync(dir);
  const out = [];

  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...listFiles(full));
      continue;
    }

    if (allowedExt.has(extname(full))) {
      out.push(full);
    }
  }

  return out;
}

function isWidthOnlyMedia(query) {
  const parts = query.split(",").map((x) => x.trim()).filter(Boolean);
  if (parts.length === 0) {
    return false;
  }

  const widthExpr = String.raw`\(\s*(?:min-width|max-width|width)\s*:\s*[^)]+\)`;
  const clause = new RegExp(String.raw`^${widthExpr}(?:\s*and\s*${widthExpr})*$`, "i");

  return parts.every((part) => clause.test(part));
}

function findInvalidMedia(content) {
  const regex = /@media\s*([^\{]+)\{/gi;
  const invalid = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const raw = match[1].trim();
    if (!isWidthOnlyMedia(raw)) {
      invalid.push(raw);
    }
  }

  return invalid;
}

const files = listFiles(root);
const violations = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const invalid = findInvalidMedia(content);
  if (invalid.length > 0) {
    violations.push({ file, invalid });
  }
}

if (violations.length > 0) {
  console.error("Responsive policy failed: only @media width queries are allowed.");
  for (const item of violations) {
    console.error(`- ${item.file}`);
    for (const media of item.invalid) {
      console.error(`  @media ${media}`);
    }
  }
  process.exit(1);
}

console.log("Responsive policy OK: all @media queries are width-only.");
