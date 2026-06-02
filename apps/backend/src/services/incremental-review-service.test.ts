import type { AIRiskIssue } from "@prism/shared";
import { describe, expect, it } from "vitest";

const preserveFindings = (
  previousReview: { review: { risk: { issues: AIRiskIssue[] } } },
  unchangedFiles: string[],
): AIRiskIssue[] => {
  const unchangedSet = new Set(unchangedFiles);
  return previousReview.review.risk.issues.filter((i) => unchangedSet.has(i.file));
};

describe("IncrementalReviewService - preserveFindings", () => {
  it("should preserve findings for unchanged files", () => {
    const issues: AIRiskIssue[] = [
      { severity: "critical", message: "a", file: "src/a.ts", line: 1, explanation: "e" },
      { severity: "warning", message: "b", file: "src/b.ts", line: 2, explanation: "e" },
    ];
    const prev = { review: { risk: { issues } } };
    const result = preserveFindings(prev, ["src/a.ts"]);
    expect(result).toHaveLength(1);
    expect(result[0].file).toBe("src/a.ts");
  });

  it("should exclude findings for changed files", () => {
    const issues: AIRiskIssue[] = [
      { severity: "info", message: "c", file: "src/c.ts", line: 3, explanation: "e" },
    ];
    const prev = { review: { risk: { issues } } };
    const result = preserveFindings(prev, ["src/d.ts"]);
    expect(result).toHaveLength(0);
  });
});
