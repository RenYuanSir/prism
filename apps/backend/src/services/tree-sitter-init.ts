import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Parser from "web-tree-sitter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);

let parser: Parser | null = null;
let tsLanguage: Parser.Language | null = null;
let tsxLanguage: Parser.Language | null = null;

export async function getParser(): Promise<Parser> {
  if (parser) return parser;

  await Parser.init();
  parser = new Parser();

  // Resolve WASM files from tree-sitter-wasms package
  const wasmPackagePath = require.resolve("tree-sitter-wasms/package.json");
  const wasmBasePath = join(dirname(wasmPackagePath), "out");

  tsLanguage = await Parser.Language.load(join(wasmBasePath, "tree-sitter-typescript.wasm"));
  tsxLanguage = await Parser.Language.load(join(wasmBasePath, "tree-sitter-tsx.wasm"));

  return parser;
}

export function getLanguage(filename: string): Parser.Language | null {
  if (filename.endsWith(".tsx") || filename.endsWith(".jsx")) {
    return tsxLanguage;
  }
  if (filename.endsWith(".ts") || filename.endsWith(".js")) {
    return tsLanguage;
  }
  return null;
}
