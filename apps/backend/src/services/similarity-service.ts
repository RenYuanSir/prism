import type { EmbeddingVector, SimilarPR } from "@prism/shared";
import type { HistoryStore } from "./history-store.js";

/** Compute cosine similarity between two embedding vectors */
export function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Find top-K similar historical PRs from the same repository */
export async function findSimilarPRs(
  currentEmbedding: EmbeddingVector,
  owner: string,
  repo: string,
  currentPrNumber: number,
  historyStore: HistoryStore,
  topK = 3,
): Promise<SimilarPR[]> {
  const entries = await historyStore.list();
  const candidates = entries.filter(
    (e) => e.owner === owner && e.repo === repo && e.prNumber !== currentPrNumber && e.hasEmbedding,
  );

  const scored: SimilarPR[] = [];
  for (const entry of candidates) {
    const review = await historyStore.get(entry.id);
    if (!review?.embedding) continue;
    const similarity = cosineSimilarity(currentEmbedding, review.embedding);
    scored.push({
      id: entry.id,
      owner: entry.owner,
      repo: entry.repo,
      prNumber: entry.prNumber,
      title: entry.title,
      createdAt: entry.createdAt,
      similarity: Math.round(similarity * 1000) / 1000,
      matchedRiskCount: entry.riskCount,
      summarySnippet: entry.summarySnippet,
    });
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}
