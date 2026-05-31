import type {
  AIReviewResult,
  AIRiskIssue,
  AISummaryResult,
  PullRequest,
  SemanticDiff,
  StreamEvent,
} from "@prism/shared";
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
  let geminiClient: LLMClient;
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

    geminiClient = createMockLLMClient(
      JSON.stringify({
        issues: [
          {
            severity: "critical",
            message: "Hardcoded secret in JWT verification",
            file: "src/auth.ts",
            line: 4,
            explanation:
              "The JWT secret is hardcoded as 'hardcoded-secret'. This is a security vulnerability.",
          },
        ],
      }),
    );

    const config: AIReviewPipelineConfig = {
      summaryClient,
      riskClient,
      geminiClient,
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
      pipeline = new AIReviewPipeline({
        summaryClient,
        riskClient,
        geminiClient,
        suggestionClient,
      });

      const result = await pipeline.analyzeRisks(pr, MOCK_DIFF, semanticDiff);

      expect(result.issues).toHaveLength(0);
    });

    it("should handle malformed JSON response gracefully", async () => {
      riskClient = createMockLLMClient("This is not valid JSON");
      pipeline = new AIReviewPipeline({
        summaryClient,
        riskClient,
        geminiClient,
        suggestionClient,
      });

      const result = await pipeline.analyzeRisks(pr, MOCK_DIFF, semanticDiff);

      expect(result.issues).toHaveLength(0);
    });

    it("should handle JSON wrapped in markdown code blocks", async () => {
      riskClient = createMockLLMClient(
        '```json\n{"issues": [{"severity": "info", "message": "Minor issue", "file": "src/auth.ts", "line": 1, "explanation": "Test"}]}\n```',
      );
      pipeline = new AIReviewPipeline({
        summaryClient,
        riskClient,
        geminiClient,
        suggestionClient,
      });

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
      pipeline = new AIReviewPipeline({
        summaryClient,
        riskClient,
        geminiClient,
        suggestionClient,
      });

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
      pipeline = new AIReviewPipeline({
        summaryClient,
        riskClient,
        geminiClient,
        suggestionClient,
      });

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
      pipeline = new AIReviewPipeline({
        summaryClient,
        riskClient,
        geminiClient,
        suggestionClient,
      });

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
    it("should execute all pipeline stages and return combined result with consensus", async () => {
      // geminiClient handles the gemini risk role independently

      pipeline = new AIReviewPipeline({
        summaryClient,
        riskClient,
        geminiClient,
        suggestionClient,
      });
      const result: AIReviewResult = await pipeline.run(pr, MOCK_DIFF, semanticDiff);

      expect(result.summary.stage).toBe("summary");
      expect(result.summary.summary).toContain("JWT-based authentication");

      expect(result.risk.stage).toBe("risk");
      expect(result.risk.issues).toHaveLength(1);

      expect(result.consensus).toBeDefined();
      expect(result.consensus.consensusIssues).toHaveLength(1);
      expect(result.consensus.consensusIssues[0].confidence).toBe("high");

      expect(result.suggestion.stage).toBe("suggestion");
    });

    it("should run summary first, then parallel risk, then suggestion", async () => {
      const callOrder: string[] = [];

      summaryClient.generateText = vi.fn().mockImplementation(async () => {
        callOrder.push("summary");
        return "Summary text";
      });
      geminiClient.generateText = vi.fn().mockImplementation(async () => {
        callOrder.push("gemini-risk");
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
      riskClient.generateText = vi.fn().mockImplementation(async () => {
        callOrder.push("claude-risk");
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

      pipeline = new AIReviewPipeline({
        summaryClient,
        riskClient,
        geminiClient,
        suggestionClient,
      });
      await pipeline.run(pr, MOCK_DIFF, semanticDiff);

      // Summary must come first
      expect(callOrder[0]).toBe("summary");
      // Both risk analyses must happen after summary
      expect(callOrder.indexOf("claude-risk")).toBeGreaterThan(0);
      expect(callOrder.indexOf("gemini-risk")).toBeGreaterThan(0);
      // Suggestion must come last
      expect(callOrder[callOrder.length - 1]).toBe("suggestion");
    });

    it("should skip suggestion generation when no consensus risks found", async () => {
      riskClient = createMockLLMClient(JSON.stringify({ issues: [] }));
      summaryClient = createMockLLMClient(JSON.stringify({ issues: [] }));
      pipeline = new AIReviewPipeline({
        summaryClient,
        riskClient,
        geminiClient,
        suggestionClient,
      });

      const result = await pipeline.run(pr, MOCK_DIFF, semanticDiff);

      expect(result.risk.issues).toHaveLength(0);
      expect(result.suggestion.suggestions).toHaveLength(0);
      expect(suggestionClient.generateText).not.toHaveBeenCalled();
    });
  });
});

describe("AIReviewPipeline parallel risk analysis", () => {
  it("should run both models in parallel and return consensus", async () => {
    const mockClaude = {
      generateText: vi.fn().mockResolvedValue(
        JSON.stringify({
          issues: [
            {
              severity: "critical",
              message: "Race condition",
              file: "src/order.ts",
              line: 42,
              explanation: "Shared state",
            },
          ],
        }),
      ),
    };

    const mockGemini = {
      generateText: vi.fn().mockResolvedValue(
        JSON.stringify({
          issues: [
            {
              severity: "critical",
              message: "Race condition detected",
              file: "src/order.ts",
              line: 43,
              explanation: "Concurrent access",
            },
          ],
        }),
      ),
    };

    const pipeline = new AIReviewPipeline({
      summaryClient: mockGemini,
      riskClient: mockClaude,
      geminiClient: mockGemini,
      suggestionClient: mockClaude,
    });

    const pr: PullRequest = {
      id: 1,
      title: "Test PR",
      description: "Test",
      author: "test",
      branch: "feature",
      baseBranch: "main",
      files: [],
      commits: [],
    };

    const semanticDiff: SemanticDiff = {
      fileChanges: [],
      summary: "test",
      totalFiles: 0,
      totalAdditions: 0,
      totalDeletions: 0,
    };

    const result = await pipeline.run(pr, "diff", semanticDiff);

    expect(result.consensus).toBeDefined();
    expect(result.consensus.consensusIssues).toHaveLength(1);
    expect(result.consensus.consensusIssues[0].confidence).toBe("high");
    expect(result.consensus.consensusIssues[0].models).toEqual(["claude", "gemini"]);
    expect(mockClaude.generateText).toHaveBeenCalled();
    expect(mockGemini.generateText).toHaveBeenCalled();
  });
});

describe("AIReviewPipeline race condition integration", () => {
  const createRaceConditionResponse = (file: string, line: number, sharedState: string) =>
    JSON.stringify({
      issues: [
        {
          severity: "critical",
          message: `Race condition on ${sharedState}`,
          file,
          line,
          explanation: "Concurrent access to shared state",
        },
      ],
      raceConditions: [
        {
          severity: "critical",
          message: `Race condition on ${sharedState}`,
          file,
          line,
          explanation: "Two async functions write to the same variable",
          sharedState,
          patternA: {
            label: "Write path A",
            functionName: "updateA",
            steps: [
              { description: "Read value", line: line - 2, isConflictPoint: false },
              { description: "Write value", line, isConflictPoint: true },
            ],
          },
          patternB: {
            label: "Write path B",
            functionName: "updateB",
            steps: [
              { description: "Read value", line: line + 5, isConflictPoint: false },
              { description: "Write value", line: line + 8, isConflictPoint: true },
            ],
          },
          conflictPoint: `Both functions modify ${sharedState} concurrently`,
        },
      ],
    });

  it("should return raceConditions array in run result", async () => {
    const mockClaude = {
      generateText: vi
        .fn()
        .mockResolvedValue(createRaceConditionResponse("src/order.ts", 42, "orderCount")),
    };
    const mockGemini = {
      generateText: vi
        .fn()
        .mockResolvedValue(createRaceConditionResponse("src/order.ts", 43, "orderCount")),
    };

    const pipeline = new AIReviewPipeline({
      summaryClient: mockGemini,
      riskClient: mockClaude,
      geminiClient: mockGemini,
      suggestionClient: mockClaude,
    });

    const pr: PullRequest = {
      id: 1,
      title: "Test PR",
      description: "Test",
      author: "test",
      branch: "feature",
      baseBranch: "main",
      files: [],
      commits: [],
    };

    const semanticDiff: SemanticDiff = {
      fileChanges: [],
      summary: "test",
      totalFiles: 0,
      totalAdditions: 0,
      totalDeletions: 0,
    };

    const result = await pipeline.run(pr, "diff", semanticDiff);

    expect(result.raceConditions).toBeDefined();
    expect(Array.isArray(result.raceConditions)).toBe(true);
  });

  it("should merge race conditions from both models with high confidence when matched", async () => {
    const mockClaude = {
      generateText: vi
        .fn()
        .mockResolvedValue(createRaceConditionResponse("src/order.ts", 42, "orderCount")),
    };
    const mockGemini = {
      generateText: vi
        .fn()
        .mockResolvedValue(createRaceConditionResponse("src/order.ts", 44, "orderCount")),
    };

    const pipeline = new AIReviewPipeline({
      summaryClient: mockGemini,
      riskClient: mockClaude,
      geminiClient: mockGemini,
      suggestionClient: mockClaude,
    });

    const pr: PullRequest = {
      id: 1,
      title: "Test",
      description: "",
      author: "test",
      branch: "feature",
      baseBranch: "main",
      files: [],
      commits: [],
    };

    const semanticDiff: SemanticDiff = {
      fileChanges: [],
      summary: "test",
      totalFiles: 0,
      totalAdditions: 0,
      totalDeletions: 0,
    };

    const result = await pipeline.run(pr, "diff", semanticDiff);

    // Both models report the same race condition (file + line within 5 + same sharedState)
    expect(result.raceConditions).toHaveLength(1);
    expect(result.raceConditions[0].confidence).toBe("high");
    expect(result.raceConditions[0].models).toEqual(["claude", "gemini"]);
    expect(result.raceConditions[0].sharedState).toBe("orderCount");
    expect(result.raceConditions[0].patternA.functionName).toBe("updateA");
    expect(result.raceConditions[0].patternB.functionName).toBe("updateB");
  });

  it("should assign medium confidence to unmatched race conditions", async () => {
    const mockClaude = {
      generateText: vi
        .fn()
        .mockResolvedValue(createRaceConditionResponse("src/order.ts", 42, "orderCount")),
    };
    const mockGemini = {
      generateText: vi
        .fn()
        .mockResolvedValue(createRaceConditionResponse("src/user.ts", 100, "userCache")),
    };

    const pipeline = new AIReviewPipeline({
      summaryClient: mockGemini,
      riskClient: mockClaude,
      geminiClient: mockGemini,
      suggestionClient: mockClaude,
    });

    const pr: PullRequest = {
      id: 1,
      title: "Test",
      description: "",
      author: "test",
      branch: "feature",
      baseBranch: "main",
      files: [],
      commits: [],
    };

    const semanticDiff: SemanticDiff = {
      fileChanges: [],
      summary: "test",
      totalFiles: 0,
      totalAdditions: 0,
      totalDeletions: 0,
    };

    const result = await pipeline.run(pr, "diff", semanticDiff);

    // Different files → no match → both get medium confidence
    expect(result.raceConditions).toHaveLength(2);
    const claudeOnly = result.raceConditions.find((rc) => rc.sharedState === "orderCount");
    const geminiOnly = result.raceConditions.find((rc) => rc.sharedState === "userCache");
    expect(claudeOnly?.confidence).toBe("medium");
    expect(claudeOnly?.models).toEqual(["claude"]);
    expect(geminiOnly?.confidence).toBe("medium");
    expect(geminiOnly?.models).toEqual(["gemini"]);
  });

  it("should return empty raceConditions when LLM response has no raceConditions field", async () => {
    const mockClaude = {
      generateText: vi.fn().mockResolvedValue(
        JSON.stringify({
          issues: [
            {
              severity: "warning",
              message: "Some issue",
              file: "src/test.ts",
              line: 1,
              explanation: "Test",
            },
          ],
        }),
      ),
    };
    const mockGemini = {
      generateText: vi.fn().mockResolvedValue(JSON.stringify({ issues: [] })),
    };

    const pipeline = new AIReviewPipeline({
      summaryClient: mockGemini,
      riskClient: mockClaude,
      geminiClient: mockGemini,
      suggestionClient: mockClaude,
    });

    const pr: PullRequest = {
      id: 1,
      title: "Test",
      description: "",
      author: "test",
      branch: "feature",
      baseBranch: "main",
      files: [],
      commits: [],
    };

    const semanticDiff: SemanticDiff = {
      fileChanges: [],
      summary: "test",
      totalFiles: 0,
      totalAdditions: 0,
      totalDeletions: 0,
    };

    const result = await pipeline.run(pr, "diff", semanticDiff);

    expect(result.raceConditions).toEqual([]);
  });

  it("should include race condition context in prompt when candidates exist", async () => {
    const mockClient = {
      generateText: vi.fn().mockResolvedValue(JSON.stringify({ issues: [] })),
    };

    const pipeline = new AIReviewPipeline({
      summaryClient: mockClient,
      riskClient: mockClient,
      geminiClient: mockClient,
      suggestionClient: mockClient,
    });

    const pr: PullRequest = {
      id: 1,
      title: "Test",
      description: "",
      author: "test",
      branch: "feature",
      baseBranch: "main",
      files: [],
      commits: [],
    };

    const semanticDiff: SemanticDiff = {
      fileChanges: [],
      summary: "test",
      totalFiles: 0,
      totalAdditions: 0,
      totalDeletions: 0,
    };

    const raceCandidates = [
      {
        sharedState: "counter",
        patterns: [
          {
            type: "async_function" as const,
            file: "src/test.ts",
            line: 10,
            endLine: 20,
            functionName: "incrementA",
            sharedStateAccess: [
              { type: "variable_write" as const, name: "counter", line: 15, isWrite: true },
            ],
          },
          {
            type: "async_function" as const,
            file: "src/test.ts",
            line: 22,
            endLine: 32,
            functionName: "incrementB",
            sharedStateAccess: [
              { type: "variable_write" as const, name: "counter", line: 27, isWrite: true },
            ],
          },
        ],
      },
    ];

    await pipeline.analyzeRisksWithModel(
      mockClient,
      "claude",
      pr,
      "diff",
      semanticDiff,
      raceCandidates,
    );

    const prompt = mockClient.generateText.mock.calls[0][0] as string;
    expect(prompt).toContain("RACE CONDITION ANALYSIS");
    expect(prompt).toContain("counter");
    expect(prompt).toContain("incrementA");
    expect(prompt).toContain("incrementB");
    expect(prompt).toContain("raceConditions");
  });

  it("should sort merged race conditions by confidence (high first)", async () => {
    const mockClaude = {
      generateText: vi.fn().mockResolvedValue(
        JSON.stringify({
          issues: [],
          raceConditions: [
            {
              severity: "warning",
              message: "Claude-only race",
              file: "src/a.ts",
              line: 10,
              explanation: "test",
              sharedState: "stateA",
              patternA: { label: "A", functionName: "fnA", steps: [] },
              patternB: { label: "B", functionName: "fnB", steps: [] },
              conflictPoint: "test",
            },
            {
              severity: "critical",
              message: "Matched race from claude",
              file: "src/b.ts",
              line: 20,
              explanation: "test",
              sharedState: "stateB",
              patternA: { label: "A", functionName: "fnA", steps: [] },
              patternB: { label: "B", functionName: "fnB", steps: [] },
              conflictPoint: "test",
            },
          ],
        }),
      ),
    };
    const mockGemini = {
      generateText: vi.fn().mockResolvedValue(
        JSON.stringify({
          issues: [],
          raceConditions: [
            {
              severity: "critical",
              message: "Matched race from gemini",
              file: "src/b.ts",
              line: 22,
              explanation: "test",
              sharedState: "stateB",
              patternA: { label: "A", functionName: "fnA", steps: [] },
              patternB: { label: "B", functionName: "fnB", steps: [] },
              conflictPoint: "test",
            },
          ],
        }),
      ),
    };

    const pipeline = new AIReviewPipeline({
      summaryClient: mockGemini,
      riskClient: mockClaude,
      geminiClient: mockGemini,
      suggestionClient: mockClaude,
    });

    const pr: PullRequest = {
      id: 1,
      title: "Test",
      description: "",
      author: "test",
      branch: "feature",
      baseBranch: "main",
      files: [],
      commits: [],
    };

    const semanticDiff: SemanticDiff = {
      fileChanges: [],
      summary: "test",
      totalFiles: 0,
      totalAdditions: 0,
      totalDeletions: 0,
    };

    const result = await pipeline.run(pr, "diff", semanticDiff);

    // High confidence (matched on src/b.ts/stateB) should come before medium (claude-only src/a.ts/stateA)
    expect(result.raceConditions).toHaveLength(2);
    expect(result.raceConditions[0].confidence).toBe("high");
    expect(result.raceConditions[0].sharedState).toBe("stateB");
    expect(result.raceConditions[1].confidence).toBe("medium");
    expect(result.raceConditions[1].sharedState).toBe("stateA");
  });
});

describe("runStream", () => {
  it("should emit events in correct order with done as final event", async () => {
    const events: StreamEvent[] = [];
    const issueResponse = JSON.stringify({
      issues: [
        { severity: "warning", message: "Test", file: "src/test.ts", line: 1, explanation: "Test" },
      ],
    });
    const mockClient = createMockLLMClient(issueResponse);
    const pipeline = new AIReviewPipeline({
      summaryClient: mockClient,
      riskClient: mockClient,
      geminiClient: mockClient,
      suggestionClient: mockClient,
    });

    const pr: PullRequest = {
      id: 1,
      title: "Test",
      description: "",
      author: "test",
      branch: "feat",
      baseBranch: "main",
      files: [],
      commits: [],
    };
    const semanticDiff: SemanticDiff = {
      fileChanges: [],
      summary: "test",
      totalFiles: 0,
      totalAdditions: 0,
      totalDeletions: 0,
    };

    await pipeline.runStream(pr, "diff", semanticDiff, {}, (e) => events.push(e));

    const types = events.map((e) => e.type);
    expect(types).toContain("stage:start");
    expect(types).toContain("summary");
    expect(types).toContain("risk:model-done");
    expect(types).toContain("consensus");
    expect(types).toContain("suggestion");
    expect(types[types.length - 1]).toBe("done");
  });

  it("should emit summary event with correct text", async () => {
    const events: StreamEvent[] = [];
    const summaryClient = createMockLLMClient("Summary text here.");
    const otherClient = createMockLLMClient(JSON.stringify({ issues: [] }));
    const pipeline = new AIReviewPipeline({
      summaryClient,
      riskClient: otherClient,
      geminiClient: otherClient,
      suggestionClient: otherClient,
    });

    await pipeline.runStream(
      {
        id: 1,
        title: "Test",
        description: "",
        author: "test",
        branch: "feat",
        baseBranch: "main",
        files: [],
        commits: [],
      },
      "diff",
      { fileChanges: [], summary: "test", totalFiles: 0, totalAdditions: 0, totalDeletions: 0 },
      {},
      (e) => events.push(e),
    );

    const evt = events.find((e) => e.type === "summary");
    expect(evt).toBeDefined();
    expect(evt!.summary).toBe("Summary text here.");
  });

  it("should emit risk:model-done for both claude and gemini", async () => {
    const events: StreamEvent[] = [];
    const mockClient = createMockLLMClient(
      JSON.stringify({
        issues: [
          {
            severity: "warning",
            message: "Test",
            file: "src/test.ts",
            line: 1,
            explanation: "Test",
          },
        ],
      }),
    );
    const pipeline = new AIReviewPipeline({
      summaryClient: mockClient,
      riskClient: mockClient,
      geminiClient: mockClient,
      suggestionClient: mockClient,
    });

    await pipeline.runStream(
      {
        id: 1,
        title: "Test",
        description: "",
        author: "test",
        branch: "feat",
        baseBranch: "main",
        files: [],
        commits: [],
      },
      "diff",
      { fileChanges: [], summary: "test", totalFiles: 0, totalAdditions: 0, totalDeletions: 0 },
      {},
      (e) => events.push(e),
    );

    const riskEvents = events.filter((e) => e.type === "risk:model-done");
    expect(riskEvents).toHaveLength(2);
    expect(riskEvents.map((e) => e.model).sort()).toEqual(["claude", "gemini"]);
  });

  it("should emit consensus with high confidence when both models agree", async () => {
    const events: StreamEvent[] = [];
    const sameIssue = JSON.stringify({
      issues: [
        {
          severity: "critical",
          message: "Hardcoded secret",
          file: "src/auth.ts",
          line: 4,
          explanation: "Secret",
        },
      ],
    });
    const mockClient = createMockLLMClient(sameIssue);
    const pipeline = new AIReviewPipeline({
      summaryClient: mockClient,
      riskClient: mockClient,
      geminiClient: mockClient,
      suggestionClient: mockClient,
    });

    await pipeline.runStream(
      {
        id: 1,
        title: "Test",
        description: "",
        author: "test",
        branch: "feat",
        baseBranch: "main",
        files: [],
        commits: [],
      },
      "diff",
      { fileChanges: [], summary: "test", totalFiles: 0, totalAdditions: 0, totalDeletions: 0 },
      {},
      (e) => events.push(e),
    );

    const evt = events.find((e) => e.type === "consensus");
    expect(evt).toBeDefined();
    expect(evt!.consensus!.consensusIssues).toHaveLength(1);
    expect(evt!.consensus!.consensusIssues[0].confidence).toBe("high");
  });

  it("should emit suggestion event with fix suggestions", async () => {
    const events: StreamEvent[] = [];
    const issueResp = JSON.stringify({
      issues: [
        { severity: "warning", message: "Test", file: "src/test.ts", line: 1, explanation: "Test" },
      ],
    });
    const riskClient = createMockLLMClient(issueResp);
    const suggestionClient = createMockLLMClient(
      JSON.stringify({
        suggestions: [{ issueIndex: 0, suggestedCode: "fix", explanation: "Better" }],
      }),
    );
    const pipeline = new AIReviewPipeline({
      summaryClient: riskClient,
      riskClient,
      geminiClient: riskClient,
      suggestionClient,
    });

    await pipeline.runStream(
      {
        id: 1,
        title: "Test",
        description: "",
        author: "test",
        branch: "feat",
        baseBranch: "main",
        files: [],
        commits: [],
      },
      "diff",
      { fileChanges: [], summary: "test", totalFiles: 0, totalAdditions: 0, totalDeletions: 0 },
      {},
      (e) => events.push(e),
    );

    const evt = events.find((e) => e.type === "suggestion");
    expect(evt).toBeDefined();
    expect(evt!.suggestions).toHaveLength(1);
  });

  it("should skip suggestion when no consensus issues", async () => {
    const events: StreamEvent[] = [];
    const emptyClient = createMockLLMClient(JSON.stringify({ issues: [] }));
    const pipeline = new AIReviewPipeline({
      summaryClient: emptyClient,
      riskClient: emptyClient,
      geminiClient: emptyClient,
      suggestionClient: emptyClient,
    });

    await pipeline.runStream(
      {
        id: 1,
        title: "Test",
        description: "",
        author: "test",
        branch: "feat",
        baseBranch: "main",
        files: [],
        commits: [],
      },
      "diff",
      { fileChanges: [], summary: "test", totalFiles: 0, totalAdditions: 0, totalDeletions: 0 },
      {},
      (e) => events.push(e),
    );

    const evt = events.find((e) => e.type === "suggestion");
    expect(evt!.suggestions).toHaveLength(0);
  });

  it("should emit error event on LLM failure", async () => {
    const events: StreamEvent[] = [];
    const failingClient = {
      generateText: vi.fn().mockRejectedValue(new Error("API timeout")),
      model: "fail",
    };
    const pipeline = new AIReviewPipeline({
      summaryClient: failingClient as LLMClient,
      riskClient: failingClient as LLMClient,
      geminiClient: failingClient as LLMClient,
      suggestionClient: failingClient as LLMClient,
    });

    // runStream should NOT throw — it communicates errors via callback
    await pipeline.runStream(
      {
        id: 1,
        title: "Test",
        description: "",
        author: "test",
        branch: "feat",
        baseBranch: "main",
        files: [],
        commits: [],
      },
      "diff",
      { fileChanges: [], summary: "test", totalFiles: 0, totalAdditions: 0, totalDeletions: 0 },
      {},
      (e) => events.push(e),
    );

    const errEvt = events.find((e) => e.type === "error");
    expect(errEvt).toBeDefined();
    expect(errEvt!.message).toBe("API timeout");
  });
});
