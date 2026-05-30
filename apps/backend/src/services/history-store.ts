import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { HistoryEntry, SavedReview } from "@prism/shared";

const MAX_ENTRIES = 100;
const INDEX_FILE = "index.json";

function makeEntry(review: SavedReview): HistoryEntry {
  const allIssues = review.review.risk.issues;
  return {
    id: review.id,
    owner: review.pr.owner,
    repo: review.pr.repo,
    prNumber: review.pr.prNumber,
    title: review.pr.title,
    createdAt: review.createdAt,
    riskCount: allIssues.length,
    criticalCount: allIssues.filter((i) => i.severity === "critical").length,
    summarySnippet: review.review.summary.summary.slice(0, 120),
  };
}

export class HistoryStore {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? join(process.cwd(), "data", "history");
  }

  private ensureDir(): void {
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private indexPath(): string {
    return join(this.baseDir, INDEX_FILE);
  }

  private reviewPath(id: string): string {
    return join(this.baseDir, `${id}.json`);
  }

  async save(review: SavedReview): Promise<void> {
    this.ensureDir();
    writeFileSync(this.reviewPath(review.id), JSON.stringify(review, null, 2), "utf-8");

    const entry = makeEntry(review);
    let index: HistoryEntry[] = [];
    try {
      index = JSON.parse(readFileSync(this.indexPath(), "utf-8")) as HistoryEntry[];
    } catch {
      index = [];
    }

    index = index.filter((e) => e.id !== review.id);
    index.unshift(entry);
    if (index.length > MAX_ENTRIES) {
      index = index.slice(0, MAX_ENTRIES);
    }
    writeFileSync(this.indexPath(), JSON.stringify(index, null, 2), "utf-8");
  }

  async list(): Promise<HistoryEntry[]> {
    try {
      return JSON.parse(readFileSync(this.indexPath(), "utf-8")) as HistoryEntry[];
    } catch {
      return this.recoverIndex();
    }
  }

  private recoverIndex(): HistoryEntry[] {
    try {
      const files = readdirSync(this.baseDir).filter(
        (f) => f.endsWith(".json") && f !== INDEX_FILE,
      );
      const entries: HistoryEntry[] = [];
      for (const file of files) {
        try {
          const review = JSON.parse(readFileSync(join(this.baseDir, file), "utf-8")) as SavedReview;
          entries.push(makeEntry(review));
        } catch {
          /* skip corrupt */
        }
      }
      entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return entries.slice(0, MAX_ENTRIES);
    } catch {
      return [];
    }
  }

  async get(id: string): Promise<SavedReview | null> {
    try {
      return JSON.parse(readFileSync(this.reviewPath(id), "utf-8")) as SavedReview;
    } catch {
      return null;
    }
  }
}
