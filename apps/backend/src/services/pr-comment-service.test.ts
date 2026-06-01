import type { AIConsensusResult, AIFixSuggestion, AIRiskSeverity } from "@prism/shared";
import { describe, expect, it } from "vitest";
import { filterIssuesForPosting, formatReviewBody } from "./pr-comment-service";

const sev = (s: AIRiskSeverity): AIRiskSeverity => s;

describe("filterIssuesForPosting", () => {
  it("filters out info-level issues, keeps critical and warning", () => {
    const result = filterIssuesForPosting({
      consensusIssues: [
        {
          issue: {
            severity: "critical",
            message: "Security hole",
            file: "a.ts",
            line: 1,
            explanation: "bad",
          },
          confidence: "high",
          models: ["claude", "gemini"],
          modelFindings: [],
        },
        {
          issue: {
            severity: "warning",
            message: "Deprecated API",
            file: "b.ts",
            line: 5,
            explanation: "old",
          },
          confidence: "medium",
          models: ["claude"],
          modelFindings: [],
        },
        {
          issue: {
            severity: "info",
            message: "Style nit",
            file: "c.ts",
            line: 10,
            explanation: "minor",
          },
          confidence: "low",
          models: ["gemini"],
          modelFindings: [],
        },
      ],
      claudeOnly: [
        {
          model: "claude",
          severity: "info",
          message: "Typo",
          file: "d.ts",
          line: 3,
          explanation: "minor",
        },
      ],
      geminiOnly: [
        {
          model: "gemini",
          severity: "warning",
          message: "Missing null check",
          file: "e.ts",
          line: 7,
          explanation: "risky",
        },
      ],
      allAgreeCount: 1,
      claudeTotal: 2,
      geminiTotal: 2,
    });

    expect(result).toHaveLength(3);
    expect(result[0].issue.severity).toBe("critical");
    expect(result[1].issue.severity).toBe("warning");
    expect(result[2].issue.severity).toBe("warning");
    expect(result[2].source).toBe("geminiOnly");
  });

  it("returns empty array when no issues match threshold", () => {
    const result = filterIssuesForPosting({
      consensusIssues: [
        {
          issue: {
            severity: "info",
            message: "Style",
            file: "a.ts",
            line: 1,
            explanation: "",
          },
          confidence: "low",
          models: ["claude"],
          modelFindings: [],
        },
      ],
      claudeOnly: [],
      geminiOnly: [],
      allAgreeCount: 0,
      claudeTotal: 1,
      geminiTotal: 0,
    });

    expect(result).toHaveLength(0);
  });

  it("handles empty consensus", () => {
    const result = filterIssuesForPosting({
      consensusIssues: [],
      claudeOnly: [],
      geminiOnly: [],
      allAgreeCount: 0,
      claudeTotal: 0,
      geminiTotal: 0,
    });

    expect(result).toHaveLength(0);
  });
});

describe("formatReviewBody", () => {
  const sampleConsensus: AIConsensusResult = {
    consensusIssues: [
      {
        issue: {
          severity: sev("critical"),
          message: "Unsafe SQL query",
          file: "src/db.ts",
          line: 42,
          explanation: "Direct string concatenation in SQL leads to injection",
        },
        confidence: "high",
        models: ["claude", "gemini"],
        modelFindings: [],
      },
      {
        issue: {
          severity: sev("warning"),
          message: "Missing error handling",
          file: "src/api.ts",
          line: 108,
          explanation: "Promise rejection not caught",
        },
        confidence: "medium",
        models: ["claude"],
        modelFindings: [],
      },
    ],
    claudeOnly: [],
    geminiOnly: [
      {
        model: "gemini",
        severity: sev("warning"),
        message: "Use of any type",
        file: "src/types.ts",
        line: 15,
        explanation: "Avoid any for type safety",
      },
    ],
    allAgreeCount: 1,
    claudeTotal: 1,
    geminiTotal: 2,
  };

  const sampleSuggestions: AIFixSuggestion[] = [
    {
      issue: {
        severity: sev("critical"),
        message: "Unsafe SQL query",
        file: "src/db.ts",
        line: 42,
        explanation: "Direct string concatenation in SQL leads to injection",
      },
      suggestedCode:
        "const query = 'SELECT * FROM users WHERE id = $1';\ndb.query(query, [userId]);",
      explanation: "Use parameterized queries to prevent SQL injection",
    },
  ];

  it("formats a review body with summary and findings", () => {
    const body = formatReviewBody(
      "This PR adds user endpoints.",
      sampleConsensus,
      sampleSuggestions,
      "owner",
      "repo",
      123,
    );

    expect(body).toContain("## 🤖 PRism AI Review");
    expect(body).toContain("### Summary");
    expect(body).toContain("This PR adds user endpoints.");
    expect(body).toContain("### Findings (3 issues)");
    expect(body).toContain("#### 🔴 Critical: Unsafe SQL query");
    expect(body).toContain("- **File**: `src/db.ts:42`");
    expect(body).toContain("- **Consensus**: claude + gemini both agree");
    expect(body).toContain("Direct string concatenation in SQL leads to injection");
    expect(body).toContain("#### Suggested Fix");
    expect(body).toContain("```suggestion");
    expect(body).toContain("const query = 'SELECT * FROM users WHERE id = $1';");
    expect(body).toContain("#### 🟡 Warning: Missing error handling");
    expect(body).toContain("- **Consensus**: claude only");
    expect(body).toContain("#### 🟡 Warning: Use of any type");
    expect(body).toContain("- **Consensus**: Gemini only");
  });

  it("handles zero findings gracefully", () => {
    const emptyConsensus: AIConsensusResult = {
      consensusIssues: [],
      claudeOnly: [],
      geminiOnly: [],
      allAgreeCount: 0,
      claudeTotal: 0,
      geminiTotal: 0,
    };

    const body = formatReviewBody("Minor changes.", emptyConsensus, [], "owner", "repo", 1);

    expect(body).toContain("No critical or warning-level issues found");
  });

  it("sorts critical issues before warnings", () => {
    const mixedConsensus: AIConsensusResult = {
      consensusIssues: [
        {
          issue: {
            severity: sev("warning"),
            message: "Warning A",
            file: "a.ts",
            line: 1,
            explanation: "",
          },
          confidence: "medium",
          models: ["claude"],
          modelFindings: [],
        },
        {
          issue: {
            severity: sev("critical"),
            message: "Critical A",
            file: "b.ts",
            line: 2,
            explanation: "",
          },
          confidence: "high",
          models: ["claude", "gemini"],
          modelFindings: [],
        },
      ],
      claudeOnly: [],
      geminiOnly: [],
      allAgreeCount: 1,
      claudeTotal: 1,
      geminiTotal: 1,
    };

    const body = formatReviewBody("Sort test.", mixedConsensus, [], "owner", "repo", 1);
    const criticalPos = body.indexOf("#### 🔴 Critical");
    const warningPos = body.indexOf("#### 🟡 Warning");

    expect(criticalPos).toBeGreaterThan(0);
    expect(warningPos).toBeGreaterThan(0);
    expect(criticalPos).toBeLessThan(warningPos);
  });
});
