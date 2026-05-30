import type { PRFile } from "@prism/shared";
import { describe, expect, it } from "vitest";
import { parseDiff } from "./diff-analyzer.js";

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
