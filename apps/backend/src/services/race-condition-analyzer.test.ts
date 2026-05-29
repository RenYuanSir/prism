import type { SemanticDiff } from "@ai-pr-review/shared";
import { describe, expect, it } from "vitest";
import {
  analyzeRaceConditionPatterns,
  detectRaceConditionCandidates,
} from "./race-condition-analyzer";

describe("analyzeRaceConditionPatterns", () => {
  it("should detect async functions with shared state writes", async () => {
    const semanticDiff: SemanticDiff = {
      fileChanges: [
        {
          filename: "src/order.ts",
          status: "modified",
          additions: 10,
          deletions: 5,
          changeType: "modified",
          summary: "Modified order processing",
          functionChanges: [
            {
              name: "processOrder",
              changeType: "modified",
              oldSignature: "processOrder()",
              newSignature: "processOrder()",
            },
          ],
          importChanges: [],
          exportChanges: [],
        },
      ],
      summary: "test",
      totalFiles: 1,
      totalAdditions: 10,
      totalDeletions: 5,
    };

    const result = await analyzeRaceConditionPatterns(semanticDiff, {
      "src/order.ts": `
        async function processOrder() {
          inventoryCount -= 1;
          await db.orders.update();
        }
        async function cancelOrder() {
          inventoryCount -= 1;
          await db.orders.update();
        }
      `,
    });

    expect(result.length).toBeGreaterThan(0);
  });

  it("should detect race condition candidates when shared state is written by multiple patterns", async () => {
    const patterns = await analyzeRaceConditionPatterns(
      {
        fileChanges: [
          {
            filename: "src/order.ts",
            status: "modified",
            additions: 10,
            deletions: 5,
            changeType: "modified",
            summary: "test",
            functionChanges: [
              { name: "processOrder", changeType: "modified", oldSignature: "", newSignature: "" },
            ],
            importChanges: [],
            exportChanges: [],
          },
        ],
        summary: "test",
        totalFiles: 1,
        totalAdditions: 10,
        totalDeletions: 5,
      },
      {
        "src/order.ts": `
          async function processOrder() {
            inventoryCount -= 1;
            await db.orders.update();
          }
          async function cancelOrder() {
            inventoryCount -= 1;
            await db.orders.update();
          }
        `,
      },
    );

    const candidates = detectRaceConditionCandidates(patterns);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0]?.sharedState).toBeDefined();
  });

  it("should not detect race conditions for single function access", async () => {
    const patterns = await analyzeRaceConditionPatterns(
      {
        fileChanges: [
          {
            filename: "src/order.ts",
            status: "modified",
            additions: 10,
            deletions: 5,
            changeType: "modified",
            summary: "test",
            functionChanges: [
              { name: "processOrder", changeType: "modified", oldSignature: "", newSignature: "" },
            ],
            importChanges: [],
            exportChanges: [],
          },
        ],
        summary: "test",
        totalFiles: 1,
        totalAdditions: 10,
        totalDeletions: 5,
      },
      {
        "src/order.ts": `
          async function processOrder() {
            inventoryCount -= 1;
          }
          function syncFunction() {
            const x = 1;
          }
        `,
      },
    );

    const candidates = detectRaceConditionCandidates(patterns);
    expect(candidates.length).toBe(0);
  });

  it("should detect DB operations as shared state", async () => {
    const patterns = await analyzeRaceConditionPatterns(
      {
        fileChanges: [
          {
            filename: "src/order.ts",
            status: "modified",
            additions: 10,
            deletions: 5,
            changeType: "modified",
            summary: "test",
            functionChanges: [
              { name: "fn", changeType: "modified", oldSignature: "", newSignature: "" },
            ],
            importChanges: [],
            exportChanges: [],
          },
        ],
        summary: "test",
        totalFiles: 1,
        totalAdditions: 10,
        totalDeletions: 5,
      },
      {
        "src/order.ts": `
          async function processOrder() {
            await db.orders.update({ status: "complete" });
          }
          async function cancelOrder() {
            await db.orders.update({ status: "cancelled" });
          }
        `,
      },
    );

    const candidates = detectRaceConditionCandidates(patterns);
    expect(candidates.length).toBeGreaterThan(0);
  });

  it("should detect cache operations as shared state", async () => {
    const patterns = await analyzeRaceConditionPatterns(
      {
        fileChanges: [
          {
            filename: "src/cache.ts",
            status: "modified",
            additions: 10,
            deletions: 5,
            changeType: "modified",
            summary: "test",
            functionChanges: [
              { name: "fn", changeType: "modified", oldSignature: "", newSignature: "" },
            ],
            importChanges: [],
            exportChanges: [],
          },
        ],
        summary: "test",
        totalFiles: 1,
        totalAdditions: 10,
        totalDeletions: 5,
      },
      {
        "src/cache.ts": `
          async function updateCache() {
            await cache.set("key", "value1");
          }
          async function invalidateCache() {
            await cache.set("key", "value2");
          }
        `,
      },
    );

    const candidates = detectRaceConditionCandidates(patterns);
    expect(candidates.length).toBeGreaterThan(0);
  });
});
