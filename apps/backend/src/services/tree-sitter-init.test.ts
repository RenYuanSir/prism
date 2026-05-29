import { describe, expect, it } from "vitest";
import { getLanguage, getParser } from "./tree-sitter-init";

describe("tree-sitter-init", () => {
  it("should initialize parser successfully", async () => {
    const parser = await getParser();
    expect(parser).toBeDefined();
  });

  it("should return same parser instance (singleton)", async () => {
    const parser1 = await getParser();
    const parser2 = await getParser();
    expect(parser1).toBe(parser2);
  });

  it("should return TypeScript language for .ts files", async () => {
    await getParser(); // Initialize first
    const lang = getLanguage("test.ts");
    expect(lang).toBeDefined();
  });

  it("should return TSX language for .tsx files", async () => {
    await getParser();
    const lang = getLanguage("test.tsx");
    expect(lang).toBeDefined();
  });

  it("should return null for unsupported extensions", async () => {
    await getParser();
    const lang = getLanguage("test.py");
    expect(lang).toBeNull();
  });
});
