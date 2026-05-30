import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import Parser from "web-tree-sitter";

const require = createRequire(import.meta.url);

let parser: Parser | null = null;
let tsLanguage: Parser.Language | null = null;
let tsxLanguage: Parser.Language | null = null;
let initPromise: Promise<Parser> | null = null;

async function initParser(): Promise<Parser> {
  try {
    await Parser.init();
    parser = new Parser();

    // Resolve WASM files from tree-sitter-wasms package
    const wasmPackagePath = require.resolve("tree-sitter-wasms/package.json");
    const wasmBasePath = join(dirname(wasmPackagePath), "out");

    tsLanguage = await Parser.Language.load(join(wasmBasePath, "tree-sitter-typescript.wasm"));
    tsxLanguage = await Parser.Language.load(join(wasmBasePath, "tree-sitter-tsx.wasm"));

    return parser;
  } catch (error) {
    // Reset state so a retry is possible
    parser = null;
    tsLanguage = null;
    tsxLanguage = null;
    initPromise = null;

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to initialize tree-sitter WASM parser: ${message}`);
  }
}

export async function getParser(): Promise<Parser> {
  if (parser) return parser;
  if (initPromise) return initPromise;

  initPromise = initParser();
  return initPromise;
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
