import type { PRFile } from "@prism/shared";
import { describe, expect, it } from "vitest";
import { filterDiffByFiles, parseDiff } from "./diff-analyzer.js";

describe("parseDiff", () => {
  it("should handle empty diff", () => {
    const result = parseDiff("");
    expect(result.size).toBe(0);
  });
});

describe("analyzeDiff", () => {
  it("should handle non-TypeScript files gracefully", async () => {
    const { analyzeDiff } = await import("./diff-analyzer.js");
    const files: PRFile[] = [
      {
        filename: "README.md",
        status: "modified",
        additions: 5,
        deletions: 2,
        changes: 7,
        patch: "@@ -1 +1 @@\n-old\n+new",
      },
    ];

    const result = await analyzeDiff(files, "");
    expect(result.fileChanges).toHaveLength(1);
    expect(result.fileChanges[0]?.filename).toBe("README.md");
    expect(result.fileChanges[0]?.functionChanges).toHaveLength(0);
  });
});

describe("filterDiffByFiles", () => {
  it("should extract only hunks for the specified file", () => {
    const diff = `diff --git a/src/foo.ts b/src/foo.ts
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1,3 +1,4 @@
 const a = 1;
+const b = 2;
 const c = 3;
diff --git a/src/bar.ts b/src/bar.ts
--- a/src/bar.ts
+++ b/src/bar.ts
@@ -1,2 +1,3 @@
 const x = 10;
+const y = 20;
+`;
    const result = filterDiffByFiles(diff, ["src/foo.ts"]);
    expect(result).toContain("src/foo.ts");
    expect(result).toContain("+const b = 2");
    expect(result).not.toContain("src/bar.ts");
  });

  it("should return empty string when no files match", () => {
    const result = filterDiffByFiles(
      "diff --git a/src/a.ts b/src/a.ts\n--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1,1 +1,2 @@\n const a = 1;\n+const b = 2;\n",
      ["src/x.ts"],
    );
    expect(result).toBe("");
  });
});
