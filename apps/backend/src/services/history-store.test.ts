import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { HistoryEntry, SavedReview } from "@prism/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HistoryStore } from "./history-store.js";

function createMockReview(overrides: Partial<SavedReview> = {}): SavedReview {
  return {
    id: "2026-05-31-testowner-testrepo-7",
    pr: {
      owner: "testowner",
      repo: "testrepo",
      prNumber: 7,
      title: "feat: test feature",
      description: "A test PR",
      author: "tester",
      branch: "feat/test",
      baseBranch: "main",
    },
    review: {
      summary: { summary: "Test summary text for the PR", stage: "summary" },
      risk: {
        issues: [
          {
            severity: "critical",
            message: "Critical bug",
            file: "src/a.ts",
            line: 1,
            explanation: "Bad",
          },
          {
            severity: "warning",
            message: "Warning",
            file: "src/b.ts",
            line: 2,
            explanation: "Meh",
          },
          { severity: "info", message: "Info", file: "src/c.ts", line: 3, explanation: "FYI" },
        ],
        stage: "risk",
      },
      consensus: {
        consensusIssues: [],
        claudeOnly: [],
        geminiOnly: [],
        allAgreeCount: 0,
        claudeTotal: 0,
        geminiTotal: 0,
      },
      raceConditions: [],
      suggestion: { suggestions: [], stage: "suggestion" },
    },
    semanticDiff: {
      fileChanges: [],
      summary: "1 file changed",
      totalFiles: 1,
      totalAdditions: 10,
      totalDeletions: 2,
    },
    createdAt: "2026-05-31T10:00:00Z",
    ...overrides,
  };
}

describe("HistoryStore", () => {
  let store: HistoryStore;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "prism-history-test-"));
    store = new HistoryStore(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should return empty list for new store", async () => {
    expect(await store.list()).toEqual([]);
  });

  it("should save and retrieve a review", async () => {
    const review = createMockReview();
    await store.save(review);
    const retrieved = await store.get(review.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(review.id);
    expect(retrieved!.pr.title).toBe("feat: test feature");
  });

  it("should return null for non-existent id", async () => {
    expect(await store.get("nonexistent")).toBeNull();
  });

  it("should list saved reviews with correct entry data", async () => {
    await store.save(createMockReview());
    const list = await store.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("2026-05-31-testowner-testrepo-7");
    expect(list[0].owner).toBe("testowner");
    expect(list[0].repo).toBe("testrepo");
    expect(list[0].prNumber).toBe(7);
    expect(list[0].riskCount).toBe(3);
    expect(list[0].criticalCount).toBe(1);
    expect(list[0].summarySnippet).toBe("Test summary text for the PR");
  });

  it("should cap index at 100 entries", async () => {
    for (let i = 0; i < 110; i++) {
      await store.save(createMockReview({ id: `entry-${i}` }));
    }
    expect((await store.list()).length).toBeLessThanOrEqual(100);
  });

  it("should list in reverse chronological order", async () => {
    await store.save(createMockReview({ id: "older", createdAt: "2026-01-01T00:00:00Z" }));
    await store.save(createMockReview({ id: "newer", createdAt: "2026-06-01T00:00:00Z" }));
    const list = await store.list();
    expect(list[0].id).toBe("newer");
    expect(list[1].id).toBe("older");
  });

  it("should recover from corrupted index", async () => {
    await store.save(createMockReview());
    writeFileSync(join(tmpDir, "index.json"), "not valid json{{{{");
    const list = await store.list();
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it("should overwrite existing review with same id", async () => {
    await store.save(
      createMockReview({ id: "dup", pr: { ...createMockReview().pr, title: "First" } }),
    );
    await store.save(
      createMockReview({ id: "dup", pr: { ...createMockReview().pr, title: "Second" } }),
    );
    expect((await store.get("dup"))!.pr.title).toBe("Second");
  });
});
