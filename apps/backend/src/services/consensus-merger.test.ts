import type { ModelFinding } from "@prism/shared";
import { describe, expect, it } from "vitest";
import { mergeConsensus } from "./consensus-merger";

describe("mergeConsensus", () => {
  it("should match findings from both models on same file and line", () => {
    const claude: ModelFinding[] = [
      {
        model: "claude",
        severity: "critical",
        message: "Race condition",
        file: "src/order.ts",
        line: 42,
        explanation: "Shared state",
      },
    ];
    const gemini: ModelFinding[] = [
      {
        model: "gemini",
        severity: "critical",
        message: "Race condition detected",
        file: "src/order.ts",
        line: 43,
        explanation: "Concurrent access",
      },
    ];

    const result = mergeConsensus(claude, gemini);
    expect(result.consensusIssues).toHaveLength(1);
    expect(result.consensusIssues[0].confidence).toBe("high");
    expect(result.consensusIssues[0].models).toEqual(["claude", "gemini"]);
  });

  it("should mark unmatched critical findings as medium confidence", () => {
    const claude: ModelFinding[] = [
      {
        model: "claude",
        severity: "critical",
        message: "Security issue",
        file: "src/auth.ts",
        line: 10,
        explanation: "SQL injection",
      },
    ];
    const gemini: ModelFinding[] = [];

    const result = mergeConsensus(claude, gemini);
    expect(result.claudeOnly).toHaveLength(1);
  });

  it("should not match findings on different files", () => {
    const claude: ModelFinding[] = [
      {
        model: "claude",
        severity: "warning",
        message: "Issue",
        file: "src/a.ts",
        line: 10,
        explanation: "Test",
      },
    ];
    const gemini: ModelFinding[] = [
      {
        model: "gemini",
        severity: "warning",
        message: "Issue",
        file: "src/b.ts",
        line: 10,
        explanation: "Test",
      },
    ];

    const result = mergeConsensus(claude, gemini);
    expect(result.consensusIssues).toHaveLength(0);
    expect(result.claudeOnly).toHaveLength(1);
    expect(result.geminiOnly).toHaveLength(1);
  });

  it("should handle empty findings", () => {
    const result = mergeConsensus([], []);
    expect(result.consensusIssues).toHaveLength(0);
    expect(result.allAgreeCount).toBe(0);
  });
});
