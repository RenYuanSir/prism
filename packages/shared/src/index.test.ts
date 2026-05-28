import { describe, expect, it } from "vitest";
import type { PullRequest, ReviewResult } from "./index";

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
