import type { AIReviewResult, SemanticDiff } from "@prism/shared";
import { describe, expect, it } from "vitest";
import { computeScore, computeTrend } from "./review-scorer";

function makeReview(overrides: Partial<AIReviewResult> = {}): AIReviewResult {
  return {
    summary: { summary: "test", stage: "summary" },
    risk: {
      issues: [
        { severity: "critical", message: "a", file: "src/a.ts", line: 1, explanation: "e" },
        { severity: "warning", message: "b", file: "src/b.ts", line: 2, explanation: "e" },
      ],
      stage: "risk",
    },
    consensus: {
      consensusIssues: [
        {
          issue: {
            severity: "critical",
            message: "a",
            file: "src/a.ts",
            line: 1,
            explanation: "e",
          },
          confidence: "high",
          models: ["claude", "gemini"],
          modelFindings: [
            {
              model: "claude",
              severity: "critical",
              message: "a",
              file: "src/a.ts",
              line: 1,
              explanation: "e",
            },
            {
              model: "gemini",
              severity: "critical",
              message: "a",
              file: "src/a.ts",
              line: 1,
              explanation: "e",
            },
          ],
        },
      ],
      claudeOnly: [],
      geminiOnly: [],
      allAgreeCount: 1,
      claudeTotal: 1,
      geminiTotal: 1,
    },
    raceConditions: [],
    suggestion: { suggestions: [], stage: "suggestion" },
    ...overrides,
  };
}

function makeDiff(totalFiles = 2): SemanticDiff {
  return {
    fileChanges: [],
    summary: "test",
    totalFiles,
    totalAdditions: 10,
    totalDeletions: 5,
  };
}

describe("computeScore", () => {
  it("should compute a perfect score for high-quality review", () => {
    const score = computeScore(makeReview(), makeDiff(2));
    expect(score.total).toBe(100);
    expect(score.coverage).toBe(1);
    expect(score.agreement).toBe(1);
    expect(score.confidence).toBe(1);
    expect(score.specificity).toBe(1);
  });

  it("should compute lower coverage when files lack issues", () => {
    const review = makeReview();
    const score = computeScore(review, makeDiff(10));
    expect(score.coverage).toBe(0.2);
    expect(score.total).toBeLessThan(100);
  });

  it("should compute lower agreement when models disagree", () => {
    const review = makeReview({
      consensus: {
        consensusIssues: [
          {
            issue: { severity: "critical", message: "a", file: "a.ts", line: 1, explanation: "e" },
            confidence: "low",
            models: ["claude", "gemini"],
            modelFindings: [],
          },
        ],
        claudeOnly: [
          {
            model: "claude",
            severity: "critical",
            message: "b",
            file: "b.ts",
            line: 2,
            explanation: "e",
          },
        ],
        geminiOnly: [],
        allAgreeCount: 0,
        claudeTotal: 2,
        geminiTotal: 1,
      },
    });
    const score = computeScore(review, makeDiff(2));
    expect(score.agreement).toBe(0);
    expect(score.total).toBeLessThan(100);
  });

  it("should handle empty findings gracefully", () => {
    const review = makeReview({
      risk: { issues: [], stage: "risk" },
      consensus: {
        consensusIssues: [],
        claudeOnly: [],
        geminiOnly: [],
        allAgreeCount: 0,
        claudeTotal: 0,
        geminiTotal: 0,
      },
    });
    const score = computeScore(review, makeDiff(0));
    expect(score.total).toBeGreaterThan(0);
  });

  it("should compute weighted confidence from high/medium/low mix", () => {
    const review = makeReview({
      risk: {
        issues: [
          { severity: "critical", message: "a", file: "a.ts", line: 1, explanation: "e" },
          { severity: "warning", message: "b", file: "b.ts", line: 1, explanation: "e" },
          { severity: "info", message: "c", file: "c.ts", line: 1, explanation: "e" },
        ],
        stage: "risk",
      },
      consensus: {
        consensusIssues: [
          {
            issue: { severity: "critical", message: "a", file: "a.ts", line: 1, explanation: "e" },
            confidence: "high",
            models: ["claude", "gemini"],
            modelFindings: [],
          },
          {
            issue: { severity: "warning", message: "b", file: "b.ts", line: 1, explanation: "e" },
            confidence: "medium",
            models: ["claude", "gemini"],
            modelFindings: [],
          },
          {
            issue: { severity: "info", message: "c", file: "c.ts", line: 1, explanation: "e" },
            confidence: "low",
            models: ["claude", "gemini"],
            modelFindings: [],
          },
        ],
        claudeOnly: [],
        geminiOnly: [],
        allAgreeCount: 1,
        claudeTotal: 3,
        geminiTotal: 3,
      },
    });
    const score = computeScore(review, makeDiff(3));
    expect(score.confidence).toBeCloseTo(2 / 3, 1);
  });
});

describe("computeTrend", () => {
  it("should return null for empty history", () => {
    expect(computeTrend(80, [])).toBeNull();
  });

  it("should return positive deviation when above average", () => {
    expect(computeTrend(90, [70, 70, 70])).toBeGreaterThan(0);
  });

  it("should return negative deviation when below average", () => {
    expect(computeTrend(50, [70, 70, 70])).toBeLessThan(0);
  });
});
