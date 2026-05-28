import { describe, expect, it } from "vitest";
import type { PRCommit, PRFile, PullRequest, ReviewIssue, ReviewResult } from "./index";

describe("shared types", () => {
  it("should allow creating a valid PullRequest object", () => {
    const pr: PullRequest = {
      id: 1,
      title: "Test PR",
      description: "Test description",
      author: "test-user",
      branch: "feat/test",
      baseBranch: "main",
      files: [],
      commits: [],
    };
    expect(pr.id).toBe(1);
    expect(pr.title).toBe("Test PR");
  });

  it("should allow creating a valid PRFile object", () => {
    const file: PRFile = {
      filename: "src/index.ts",
      status: "modified",
      additions: 10,
      deletions: 5,
      changes: 15,
      patch: "@@ -1,5 +1,10 @@",
    };
    expect(file.filename).toBe("src/index.ts");
    expect(file.status).toBe("modified");
  });

  it("should allow creating a valid PRCommit object", () => {
    const commit: PRCommit = {
      sha: "abc123",
      message: "feat: add feature",
      author: "test-user",
      date: "2024-01-01T00:00:00Z",
    };
    expect(commit.sha).toBe("abc123");
    expect(commit.message).toBe("feat: add feature");
  });

  it("should allow creating a valid ReviewIssue object", () => {
    const issue: ReviewIssue = {
      severity: "warning",
      message: "Unused variable",
      file: "src/index.ts",
      line: 42,
    };
    expect(issue.severity).toBe("warning");
    expect(issue.line).toBe(42);
  });

  it("should allow creating a valid ReviewResult object", () => {
    const result: ReviewResult = {
      prId: 1,
      summary: "Test summary",
      issues: [],
      score: 85,
    };
    expect(result.prId).toBe(1);
    expect(result.score).toBe(85);
  });
});
