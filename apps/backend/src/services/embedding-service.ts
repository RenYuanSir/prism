import type { AIReviewResult, EmbeddingVector, LLMEmbeddingConfig } from "@prism/shared";

/**
 * Build a text representation of review findings for embedding.
 */
export function buildReviewText(review: AIReviewResult): string {
  const parts: string[] = [];
  if (review.summary.summary) {
    parts.push(review.summary.summary);
  }
  for (const issue of review.risk.issues) {
    parts.push(
      `[${issue.severity}] ${issue.file}:${issue.line} ${issue.message} ${issue.explanation}`,
    );
  }
  return parts.join("\n");
}

/**
 * Generate an embedding vector via OpenAI-compatible embeddings API.
 */
export async function generateEmbedding(
  text: string,
  config: LLMEmbeddingConfig,
): Promise<EmbeddingVector> {
  const baseUrl = config.baseUrl || "https://api.openai.com/v1";
  const url = `${baseUrl.replace(/\/$/, "")}/embeddings`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return json.data[0].embedding;
}
