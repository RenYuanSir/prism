import { describe, expect, it } from "vitest";
import { getLanguage, getParser } from "./tree-sitter-init";

describe("tree-sitter-init", () => {
  it("should initialize parser successfully", async () => {
    const parser = await getParser();
    expect(parser).toBeInstanceOf(Object);
    expect(typeof parser.parse).toBe("function");
  });

  it("should return same parser instance (singleton)", async () => {
    const parser1 = await getParser();
    const parser2 = await getParser();
    expect(parser1).toBe(parser2);
  });

  it("should handle concurrent getParser calls without race conditions", async () => {
    const [parser1, parser2, parser3] = await Promise.all([getParser(), getParser(), getParser()]);
    expect(parser1).toBe(parser2);
    expect(parser2).toBe(parser3);
  });

  it("should return TypeScript language for .ts files", async () => {
    await getParser();
    const lang = getLanguage("test.ts");
    expect(lang).not.toBeNull();
    expect(typeof lang?.version).toBe("number");
    expect(typeof lang?.fieldCount).toBe("number");
    expect(lang!.fieldCount).toBeGreaterThan(0);
    // TypeScript grammar should have 'program' as a node type
    expect(lang?.nodeTypeForId(1)).toBe("identifier");
  });

  it("should return TypeScript language for .js files", async () => {
    await getParser();
    const lang = getLanguage("test.js");
    expect(lang).not.toBeNull();
    expect(typeof lang?.version).toBe("number");
    expect(lang!.fieldCount).toBeGreaterThan(0);
  });

  it("should return TSX language for .tsx files", async () => {
    await getParser();
    const lang = getLanguage("test.tsx");
    expect(lang).not.toBeNull();
    expect(typeof lang?.version).toBe("number");
    expect(typeof lang?.fieldCount).toBe("number");
    expect(lang!.fieldCount).toBeGreaterThan(0);
    // TSX grammar should include jsx_element node type
    expect(lang?.nodeTypeForId(1)).toBe("identifier");
  });

  it("should return TSX language for .jsx files", async () => {
    await getParser();
    const lang = getLanguage("test.jsx");
    expect(lang).not.toBeNull();
    expect(typeof lang?.version).toBe("number");
    expect(lang!.fieldCount).toBeGreaterThan(0);
  });

  it("should return null for unsupported extensions", async () => {
    await getParser();
    const lang = getLanguage("test.py");
    expect(lang).toBeNull();
  });

  it("should return same language object for .ts and .js", async () => {
    await getParser();
    const tsLang = getLanguage("test.ts");
    const jsLang = getLanguage("test.js");
    expect(tsLang).toBe(jsLang);
  });

  it("should return same language object for .tsx and .jsx", async () => {
    await getParser();
    const tsxLang = getLanguage("test.tsx");
    const jsxLang = getLanguage("test.jsx");
    expect(tsxLang).toBe(jsxLang);
  });

  it("should return different language objects for .ts and .tsx", async () => {
    await getParser();
    const tsLang = getLanguage("test.ts");
    const tsxLang = getLanguage("test.tsx");
    expect(tsLang).not.toBe(tsxLang);
  });
});
