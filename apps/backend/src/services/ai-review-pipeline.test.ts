import type {
  AIReviewResult,
  AIRiskIssue,
  AISummaryResult,
  PullRequest,
  SemanticDiff,
} from "@ai-pr-review/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AIReviewPipeline,
  type AIReviewPipelineConfig,
  type LLMClient,
} from "./ai-review-pipeline";

function createMockLLMClient(response: string): LLMClient {
  return {
    generateText: vi.fn().mockResolvedValue(response),
  };
}

function createMockPR(): PullRequest {
  return {
    id: 42,
    title: "Add user authentication",
    description: "Implements JWT-based authentication for the API",
    author: "developer",
    branch: "feat/auth",
    baseBranch: "main",
    files: [
      {
        filename: "src/auth.ts",
        status: "added",
        additions: 50,
        deletions: 0,
        changes: 50,
        patch:
          "@@ -0,0 +1,50 @@\n+export function authenticate(token: string) {\n+  return jwt.verify(token, 'secret');\n+}",
      },
    ],
    commits: [
      {
        sha: "abc123",
        message: "feat: add authentication",
        author: "developer",
        date: "2024-01-15T10:00:00Z",
      },
    ],
  };
}

function createMockSemanticDiff(): SemanticDiff {
  return {
    fileChanges: [
      {
        filename: "src/auth.ts",
        status: "added",
        additions: 50,
        deletions: 0,
        changeType: "added",
        summary: "1 function change(s)",
        functionChanges: [
          {
            name: "authenticate",
            changeType: "added",
            newSignature: "(token: string) => JwtPayload",
          },
        ],
        importChanges: [],
        exportChanges: [
          {
            name: "authenticate",
            changeType: "added",
            isDefault: false,
          },
        ],
      },
    ],
    summary: "Analyzed 1 file(s): 1 function change(s), 0 import change(s), 1 export change(s)",
    totalFiles: 1,
    totalAdditions: 50,
    totalDeletions: 0,
  };
}

const MOCK_DIFF = `diff --git a/src/auth.ts b/src/auth.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/src/auth.ts
@@ -0,0 +1,5 @@
+import jwt from 'jsonwebtoken';
+
+export function authenticate(token: string) {
+  return jwt.verify(token, 'hardcoded-secret');
+}
`;

describe("AIReviewPipeline", () => {
  let pipeline: AIReviewPipeline;
  let summaryClient: LLMClient;
  let riskClient: LLMClient;
  let suggestionClient: LLMClient;
  let pr: PullRequest;
  let semanticDiff: SemanticDiff;

  beforeEach(() => {
    summaryClient = createMockLLMClient(
      "This PR implements JWT-based authentication for the API, adding an authenticate function that verifies tokens.",
    );

    riskClient = createMockLLMClient(
      JSON.stringify({
        issues: [
          {
            severity: "critical",
            message: "Hardcoded secret in JWT verification",
            file: "src/auth.ts",
            line: 4,
            explanation:
              "The JWT secret is hardcoded as 'hardcoded-secret'. This is a security vulnerability because secrets should never be committed to source code. They should be loaded from environment variables or a secure secrets manager.",
          },
          {
            severity: "warning",
            message: "No error handling for invalid tokens",
            file: "src/auth.ts",
            line: 4,
            explanation:
              "jwt.verify throws an error for invalid tokens, but this function doesn't catch it. Callers will receive an uncaught exception instead of a proper error response.",
          },
        ],
      }),
    );

    suggestionClient = createMockLLMClient(
      JSON.stringify({
        suggestions: [
          {
            issueIndex: 0,
            suggestedCode: `import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export function authenticate(token: string) {
  return jwt.verify(token, JWT_SECRET);
}`,
            explanation:
              "Load the JWT secret from an environment variable and fail fast if it's not configured. This prevents accidental use of insecure default secrets.",
          },
          {
            issueIndex: 1,
            suggestedCode: `export function authenticate(token: string): jwt.JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return null;
    }
    throw error;
  }
}`,
            explanation:
              "Wrap jwt.verify in a try-catch to handle invalid tokens gracefully. Return null for token errors so callers can distinguish invalid tokens from server errors.",
          },
        ],
      }),
    );

    const config: AIReviewPipelineConfig = {
      summaryClient,
      riskClient,
      suggestionClient,
    };

    pipeline = new AIReviewPipeline(config);
    pr = createMockPR();
    semanticDiff = createMockSemanticDiff();
  });

  describe("generateSummary", () => {
    it("should generate a summary using the summary client", async () => {
      const result: AISummaryResult = await pipeline.generateSummary(pr, semanticDiff);

      expect(result.stage).toBe("summary");
      expect(result.summary).toContain("JWT-based authentication");
      expect(summaryClient.generateText).toHaveBeenCalledTimes(1);

      const prompt = (summaryClient.generateText as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(prompt).toContain(pr.title);
      expect(prompt).toContain(pr.description);
      expect(prompt).toContain("src/auth.ts");
    });

    it("should handle PR with empty description", async () => {
      const prNoDesc: PullRequest = { ...pr, description: "" };

      const result = await pipeline.generateSummary(prNoDesc, semanticDiff);

      expect(result.summary).toBeTruthy();
      const prompt = (summaryClient.generateText as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(prompt).toContain("(no description)");
    });
  });

  describe("analyzeRisks", () => {
    it("should parse risk issues from LLM response", async () => {
      const result = await pipeline.analyzeRisks(pr, MOCK_DIFF, semanticDiff);

      expect(result.stage).toBe("risk");
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0].severity).toBe("critical");
      expect(result.issues[0].file).toBe("src/auth.ts");
      expect(result.issues[0].line).toBe(4);
      expect(result.issues[0].message).toContain("Hardcoded secret");
      expect(result.issues[1].severity).toBe("warning");
    });

    it("should handle empty issues response", async () => {
      riskClient = createMockLLMClient(JSON.stringify({ issues: [] }));
      pipeline = new AIReviewPipeline({ summaryClient, riskClient, suggestionClient });

      const result = await pipeline.analyzeRisks(pr, MOCK_DIFF, semanticDiff);

      expect(result.issues).toHaveLength(0);
    });

    it("should handle malformed JSON response gracefully", async () => {
      riskClient = createMockLLMClient("This is not valid JSON");
      pipeline = new AIReviewPipeline({ summaryClient, riskClient, suggestionClient });

      const result = await pipeline.analyzeRisks(pr, MOCK_DIFF, semanticDiff);

      expect(result.issues).toHaveLength(0);
    });

    it("should handle JSON wrapped in markdown code blocks", async () => {
      riskClient = createMockLLMClient(
        '```json\n{"issues": [{"severity": "info", "message": "Minor issue", "file": "src/auth.ts", "line": 1, "explanation": "Test"}]}\n```',
      );
      pipeline = new AIReviewPipeline({ summaryClient, riskClient, suggestionClient });

      const result = await pipeline.analyzeRisks(pr, MOCK_DIFF, semanticDiff);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe("info");
    });

    it("should validate severity values", async () => {
      riskClient = createMockLLMClient(
        JSON.stringify({
          issues: [
            {
              severity: "invalid-severity",
              message: "Test issue",
              file: "src/auth.ts",
              line: 1,
              explanation: "Test",
            },
          ],
        }),
      );
      pipeline = new AIReviewPipeline({ summaryClient, riskClient, suggestionClient });

      const result = await pipeline.analyzeRisks(pr, MOCK_DIFF, semanticDiff);

      expect(result.issues[0].severity).toBe("info");
    });

    it("should filter out incomplete issue objects", async () => {
      riskClient = createMockLLMClient(
        JSON.stringify({
          issues: [
            {
              severity: "critical",
              message: "Valid issue",
              file: "src/auth.ts",
              line: 1,
              explanation: "Valid explanation",
            },
            {
              severity: "warning",
              message: "Missing fields",
            },
          ],
        }),
      );
      pipeline = new AIReviewPipeline({ summaryClient, riskClient, suggestionClient });

      const result = await pipeline.analyzeRisks(pr, MOCK_DIFF, semanticDiff);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].message).toBe("Valid issue");
    });

    it("should build risk prompt with diff content", async () => {
      await pipeline.analyzeRisks(pr, MOCK_DIFF, semanticDiff);

      const prompt = (riskClient.generateText as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(prompt).toContain("hardcoded-secret");
      expect(prompt).toContain(pr.title);
      expect(prompt).toContain("Security vulnerabilities");
    });
  });

  describe("generateSuggestions", () => {
    it("should generate fix suggestions for identified issues", async () => {
      const issues: AIRiskIssue[] = [
        {
          severity: "critical",
          message: "Hardcoded secret",
          file: "src/auth.ts",
          line: 4,
          explanation: "Secret should not be hardcoded",
        },
      ];

      const result = await pipeline.generateSuggestions(issues, MOCK_DIFF);

      expect(result.stage).toBe("suggestion");
      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0].suggestedCode).toContain("JWT_SECRET");
      expect(result.suggestions[0].explanation).toContain("environment variable");
      expect(result.suggestions[0].issue).toBe(issues[0]);
    });

    it("should return empty suggestions when no issues provided", async () => {
      const result = await pipeline.generateSuggestions([], MOCK_DIFF);

      expect(result.suggestions).toHaveLength(0);
      expect(suggestionClient.generateText).not.toHaveBeenCalled();
    });

    it("should handle malformed suggestion response", async () => {
      suggestionClient = createMockLLMClient("Not valid JSON");
      pipeline = new AIReviewPipeline({ summaryClient, riskClient, suggestionClient });

      const issues: AIRiskIssue[] = [
        {
          severity: "warning",
          message: "Test",
          file: "test.ts",
          line: 1,
          explanation: "Test",
        },
      ];

      const result = await pipeline.generateSuggestions(issues, MOCK_DIFF);

      expect(result.suggestions).toHaveLength(0);
    });

    it("should map suggestions to correct issues by index", async () => {
      const issues: AIRiskIssue[] = [
        {
          severity: "critical",
          message: "Issue A",
          file: "a.ts",
          line: 1,
          explanation: "A",
        },
        {
          severity: "warning",
          message: "Issue B",
          file: "b.ts",
          line: 2,
          explanation: "B",
        },
      ];

      const result = await pipeline.generateSuggestions(issues, MOCK_DIFF);

      expect(result.suggestions[0].issue).toBe(issues[0]);
      expect(result.suggestions[1].issue).toBe(issues[1]);
    });
  });

  describe("run", () => {
    it("should execute all three pipeline stages and return combined result", async () => {
      const result: AIReviewResult = await pipeline.run(pr, MOCK_DIFF, semanticDiff);

      expect(result.summary.stage).toBe("summary");
      expect(result.summary.summary).toContain("JWT-based authentication");

      expect(result.risk.stage).toBe("risk");
      expect(result.risk.issues).toHaveLength(2);

      expect(result.suggestion.stage).toBe("suggestion");
      expect(result.suggestion.suggestions).toHaveLength(2);
    });

    it("should call clients in sequence", async () => {
      const callOrder: string[] = [];

      summaryClient.generateText = vi.fn().mockImplementation(async () => {
        callOrder.push("summary");
        return "Summary text";
      });
      riskClient.generateText = vi.fn().mockImplementation(async () => {
        callOrder.push("risk");
        return JSON.stringify({
          issues: [
            {
              severity: "warning",
              message: "Test issue",
              file: "test.ts",
              line: 1,
              explanation: "Test",
            },
          ],
        });
      });
      suggestionClient.generateText = vi.fn().mockImplementation(async () => {
        callOrder.push("suggestion");
        return JSON.stringify({ suggestions: [] });
      });

      pipeline = new AIReviewPipeline({ summaryClient, riskClient, suggestionClient });
      await pipeline.run(pr, MOCK_DIFF, semanticDiff);

      expect(callOrder).toEqual(["summary", "risk", "suggestion"]);
    });

    it("should skip suggestion generation when no risks found", async () => {
      riskClient = createMockLLMClient(JSON.stringify({ issues: [] }));
      pipeline = new AIReviewPipeline({ summaryClient, riskClient, suggestionClient });

      const result = await pipeline.run(pr, MOCK_DIFF, semanticDiff);

      expect(result.risk.issues).toHaveLength(0);
      expect(result.suggestion.suggestions).toHaveLength(0);
      expect(suggestionClient.generateText).not.toHaveBeenCalled();
    });
  });
});
