import { describe, expect, it } from "vitest";
import { cosineSimilarity, findSimilarPRs } from "./similarity-service.js";
import type { EmbeddingVector, HistoryEntry, SavedReview } from "@prism/shared";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const v: EmbeddingVector = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    const a: EmbeddingVector = [1, 0, 0];
    const b: EmbeddingVector = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it("returns intermediate value for partially similar vectors", () => {
    const a: EmbeddingVector = [1, 1, 0];
    const b: EmbeddingVector = [0, 1, 1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.5, 5);
  });
});

describe("findSimilarPRs", () => {
  function makeEntry(
    id: string,
    owner: string,
    repo: string,
    prNumber: number,
    embedding: EmbeddingVector | undefined,
  ): { entry: HistoryEntry; review: SavedReview } {
    const entry: HistoryEntry = {
      id,
      owner,
      repo,
      prNumber,
      title: `PR #${prNumber}`,
      createdAt: "2025-01-01T00:00:00Z",
      riskCount: 2,
      criticalCount: 1,
      summarySnippet: "Summary of " + id,
      hasEmbedding: embedding != null,
    };
    const review: SavedReview = {
      id,
      pr: { owner, repo, prNumber, title: entry.title, description: "", author: "test", branch: "main", baseBranch: "main", headSha: "abc123" },
      review: {
        summary: { summary: "", stage: "summary" },
        risk: { issues: [], stage: "risk" },
        consensus: { consensusIssues: [], claudeOnly: [], geminiOnly: [], allAgreeCount: 0, claudeTotal: 0, geminiTotal: 0 },
        raceConditions: [],
        suggestion: { suggestions: [], stage: "suggestion" },
      },
      semanticDiff: { fileChanges: [], summary: "", totalFiles: 0, totalAdditions: 0, totalDeletions: 0 },
      createdAt: "2025-01-01T00:00:00Z",
      embedding,
    };
    return { entry, review };
  }

  it("returns top-K similar PRs sorted by similarity", async () => {
    const { entry: e1, review: r1 } = makeEntry("a", "owner", "repo", 1, [1, 0, 0, 0]);
    const { entry: e2, review: r2 } = makeEntry("b", "owner", "repo", 2, [1, 0.1, 0, 0]);
    const { entry: e3, review: r3 } = makeEntry("c", "owner", "repo", 3, [0, 0, 0, 1]);

    const mockStore = {
      list: async () => [e1, e2, e3],
      get: async (id: string) => {
        if (id === "a") return r1;
        if (id === "b") return r2;
        if (id === "c") return r3;
        return null;
      },
    } as any;

    const currentEmbedding: EmbeddingVector = [1, 0, 0, 0];
    const results = await findSimilarPRs(currentEmbedding, "owner", "repo", 99, mockStore, 3);
    expect(results.length).toBe(3);
    expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
    expect(results[0].id).toBe("a");
    expect(results[1].id).toBe("b");
    expect(results[2].id).toBe("c");
  });

  it("skips current PR id", async () => {
    const { entry: e1, review: r1 } = makeEntry("x", "owner", "repo", 5, [1, 0, 0]);
    const mockStore = {
      list: async () => [e1],
      get: async () => r1,
    } as any;

    const results = await findSimilarPRs([1, 0, 0], "owner", "repo", 5, mockStore, 3);
    expect(results).toHaveLength(0);
  });

  it("skips entries without embedding", async () => {
    const { entry: e1, review: r1 } = makeEntry("noemb", "owner", "repo", 10, undefined);
    const mockStore = {
      list: async () => [e1],
      get: async () => r1,
    } as any;

    const results = await findSimilarPRs([1, 0], "owner", "repo", 99, mockStore, 3);
    expect(results).toHaveLength(0);
  });

  it("filters by owner/repo only", async () => {
    const { entry: e1, review: r1 } = makeEntry("same", "owner", "repo", 1, [1, 0]);
    const { entry: e2, review: r2 } = makeEntry("diff", "other", "repo", 2, [1, 0]);
    const mockStore = {
      list: async () => [e1, e2],
      get: async (id: string) => (id === "same" ? r1 : r2),
    } as any;

    const results = await findSimilarPRs([1, 0], "owner", "repo", 99, mockStore, 3);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("same");
  });
});
