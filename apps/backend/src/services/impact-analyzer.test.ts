import type { FileChange, SemanticDiff } from "@prism/shared";
import { describe, expect, it } from "vitest";
import { analyzeImpact, resolveImportPath } from "./impact-analyzer.js";

function makeFileChange(overrides: Partial<FileChange> & { filename: string }): FileChange {
  return {
    status: "modified",
    additions: 1,
    deletions: 0,
    changeType: "modified",
    summary: `Modified ${overrides.filename}`,
    functionChanges: [],
    importChanges: [],
    exportChanges: [],
    ...overrides,
  };
}

function makeSemanticDiff(fileChanges: FileChange[]): SemanticDiff {
  return {
    fileChanges,
    summary: "test",
    totalFiles: fileChanges.length,
    totalAdditions: fileChanges.reduce((s, f) => s + f.additions, 0),
    totalDeletions: fileChanges.reduce((s, f) => s + f.deletions, 0),
  };
}

describe("resolveImportPath", () => {
  it("should resolve a relative sibling import", () => {
    const result = resolveImportPath("./foo", "src/bar.ts", ["src/foo.ts", "src/bar.ts"]);
    expect(result).toBe("src/foo.ts");
  });

  it("should resolve a relative import with nested paths", () => {
    const result = resolveImportPath("./utils/helper", "src/index.ts", [
      "src/utils/helper.ts",
      "src/index.ts",
    ]);
    expect(result).toBe("src/utils/helper.ts");
  });

  it("should resolve parent directory imports", () => {
    const result = resolveImportPath("../foo", "src/components/bar.ts", [
      "src/foo.ts",
      "src/components/bar.ts",
    ]);
    expect(result).toBe("src/foo.ts");
  });

  it("should return null for package imports", () => {
    const result = resolveImportPath("react", "src/index.ts", ["src/index.ts"]);
    expect(result).toBeNull();
  });

  it("should return null for scoped package imports", () => {
    const result = resolveImportPath("@prism/shared", "src/index.ts", ["src/index.ts"]);
    expect(result).toBeNull();
  });

  it("should return null when no file matches", () => {
    const result = resolveImportPath("./nonexistent", "src/index.ts", ["src/index.ts"]);
    expect(result).toBeNull();
  });

  it("should handle .js extension in import paths", () => {
    const result = resolveImportPath("./foo.js", "src/bar.ts", ["src/foo.ts", "src/bar.ts"]);
    expect(result).toBe("src/foo.ts");
  });
});

describe("analyzeImpact", () => {
  it("should handle empty semantic diff", () => {
    const diff = makeSemanticDiff([]);
    const graph = analyzeImpact(diff);

    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
    expect(graph.maxImpactScore).toBe(0);
    expect(graph.highImpactCount).toBe(0);
  });

  it("should build nodes for each file change", () => {
    const diff = makeSemanticDiff([
      makeFileChange({ filename: "src/foo.ts" }),
      makeFileChange({ filename: "src/bar.ts" }),
    ]);
    const graph = analyzeImpact(diff);

    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes[0]?.filename).toBe("src/foo.ts");
    expect(graph.nodes[1]?.filename).toBe("src/bar.ts");
  });

  it("should detect dependencies via import/export matching", () => {
    const diff = makeSemanticDiff([
      makeFileChange({
        filename: "src/foo.ts",
        exportChanges: [{ name: "doSomething", changeType: "modified", isDefault: false }],
      }),
      makeFileChange({
        filename: "src/bar.ts",
        importChanges: [
          { module: "./foo", changeType: "modified", imports: ["doSomething"], isDefault: false },
        ],
      }),
    ]);

    const graph = analyzeImpact(diff);

    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]?.from).toBe("src/bar.ts");
    expect(graph.edges[0]?.to).toBe("src/foo.ts");
    expect(graph.edges[0]?.symbols).toContain("doSomething");
  });

  it("should assign higher impact score to files with dependents", () => {
    const diff = makeSemanticDiff([
      makeFileChange({
        filename: "src/foo.ts",
        exportChanges: [{ name: "doSomething", changeType: "modified", isDefault: false }],
      }),
      makeFileChange({
        filename: "src/bar.ts",
        importChanges: [
          { module: "./foo", changeType: "modified", imports: ["doSomething"], isDefault: false },
        ],
      }),
    ]);

    const graph = analyzeImpact(diff);
    const fooNode = graph.nodes.find((n) => n.filename === "src/foo.ts");
    const barNode = graph.nodes.find((n) => n.filename === "src/bar.ts");

    expect(fooNode).toBeDefined();
    expect(barNode).toBeDefined();
    expect(fooNode!.impactScore).toBeGreaterThan(barNode!.impactScore);
    expect(fooNode!.directDependents).toContain("src/bar.ts");
    expect(barNode!.directDependencies).toContain("src/foo.ts");
  });

  it("should assign high impact level to widely-depended files", () => {
    const diff = makeSemanticDiff([
      makeFileChange({
        filename: "src/core.ts",
        exportChanges: [{ name: "coreFn", changeType: "modified", isDefault: false }],
      }),
      makeFileChange({
        filename: "src/a.ts",
        importChanges: [
          { module: "./core", changeType: "modified", imports: ["coreFn"], isDefault: false },
        ],
      }),
      makeFileChange({
        filename: "src/b.ts",
        importChanges: [
          { module: "./core", changeType: "modified", imports: ["coreFn"], isDefault: false },
        ],
      }),
      makeFileChange({
        filename: "src/c.ts",
        importChanges: [
          { module: "./core", changeType: "modified", imports: ["coreFn"], isDefault: false },
        ],
      }),
    ]);

    const graph = analyzeImpact(diff);
    const coreNode = graph.nodes.find((n) => n.filename === "src/core.ts");

    expect(coreNode).toBeDefined();
    expect(coreNode!.impactLevel).toBe("high");
    expect(coreNode!.affectedFileCount).toBe(3);
    expect(graph.highImpactCount).toBeGreaterThanOrEqual(1);
  });

  it("should assign low impact to files with no dependents", () => {
    const diff = makeSemanticDiff([
      makeFileChange({ filename: "src/isolated.ts" }),
      makeFileChange({ filename: "src/other.ts" }),
    ]);

    const graph = analyzeImpact(diff);
    const isolatedNode = graph.nodes.find((n) => n.filename === "src/isolated.ts");

    expect(isolatedNode).toBeDefined();
    expect(isolatedNode!.impactLevel).toBe("low");
    expect(isolatedNode!.directDependents).toHaveLength(0);
  });

  it("should not create self-referencing edges", () => {
    const diff = makeSemanticDiff([
      makeFileChange({
        filename: "src/foo.ts",
        exportChanges: [{ name: "foo", changeType: "added", isDefault: false }],
        importChanges: [
          { module: "./foo", changeType: "added", imports: ["foo"], isDefault: false },
        ],
      }),
    ]);

    const graph = analyzeImpact(diff);
    expect(graph.edges).toHaveLength(0);
  });

  it("should correctly count impact level totals", () => {
    const diff = makeSemanticDiff([
      makeFileChange({ filename: "src/a.ts" }),
      makeFileChange({ filename: "src/b.ts" }),
      makeFileChange({ filename: "src/c.ts" }),
    ]);

    const graph = analyzeImpact(diff);
    const total = graph.highImpactCount + graph.mediumImpactCount + graph.lowImpactCount;
    expect(total).toBe(graph.nodes.length);
  });
});
